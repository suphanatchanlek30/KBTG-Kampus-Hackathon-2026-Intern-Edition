package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/dto"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

const maxMemoLen = 100

type TransferService struct {
	repo  *repository.Repository
	clock clock.Clock
}

func NewTransferService(repo *repository.Repository, c clock.Clock) *TransferService {
	return &TransferService{repo: repo, clock: c}
}

// Payees — GET /transfers/payees
func (s *TransferService) Payees(ctx context.Context, actor domain.Actor) (dto.PayeesDTO, error) {
	rows, err := s.repo.ListPayees(ctx, db.ListPayeesParams{UserID: actor.UserID, SandboxID: actor.SandboxID})
	if err != nil {
		return dto.PayeesDTO{}, fmt.Errorf("list payees: %w", err)
	}
	out := dto.PayeesDTO{Items: make([]dto.PayeeDTO, 0, len(rows))}
	for _, r := range rows {
		out.Items = append(out.Items, dto.PayeeDTO{
			AccountID: r.AccountID.String(), DisplayName: r.DisplayName, BankName: r.BankName, AccountNoMasked: r.AccountNoMasked,
		})
	}
	return out, nil
}

func (s *TransferService) Precheck(ctx context.Context, actor domain.Actor, rawTo string) (dto.TransferPrecheckDTO, error) {
	to, err := uuid.Parse(rawTo)
	if err != nil {
		return dto.TransferPrecheckDTO{}, invalid("toAccountId", "must be a UUID", "บัญชีปลายทางไม่ถูกต้อง")
	}
	w, err := s.warning(ctx, s.repo.Queries, actor, to)
	if err != nil {
		return dto.TransferPrecheckDTO{}, err
	}
	return dto.TransferPrecheckDTO{Warning: w}, nil
}

type TransferInput struct {
	ToAccountID  string
	AmountSatang int64
	Memo         string
	Action       string // CONFIRM or CANCEL after the warning.
}

func (s *TransferService) Create(ctx context.Context, actor domain.Actor, idem IdemRequest, in TransferInput) (Response, error) {
	to, err := uuid.Parse(in.ToAccountID)
	if err != nil {
		return Response{}, invalid("toAccountId", "must be a UUID", "บัญชีปลายทางไม่ถูกต้อง")
	}
	if in.AmountSatang <= 0 || in.AmountSatang > maxDealSatang {
		return Response{}, invalid("amountSatang", fmt.Sprintf("must be between 1 and %d", maxDealSatang), "จำนวนเงินไม่ถูกต้อง")
	}
	if len([]rune(in.Memo)) > maxMemoLen {
		return Response{}, invalid("memo", fmt.Sprintf("at most %d characters", maxMemoLen), "บันทึกช่วยจำยาวเกินไป")
	}
	status := db.TransferStatusCOMPLETEDSIMULATED
	switch in.Action {
	case "CONFIRM":
	case "CANCEL":
		status = db.TransferStatusCANCELLEDBYUSER
	default:
		return Response{}, invalid("action", "CONFIRM | CANCEL", "คำสั่งโอนไม่ถูกต้อง")
	}

	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusCreated, func(q *db.Queries) (any, error) {
		from, err := q.GetPrimaryAccount(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get my account: %w", err)
		}
		if to == from.ID {
			return nil, invalid("toAccountId", "must not be your own account", "โอนเข้าบัญชีตัวเองไม่ได้")
		}
		if _, err := q.GetAccount(ctx, to); repository.IsNotFound(err) {
			return nil, domain.NewError(domain.CodeNotFound, "ไม่พบบัญชีปลายทาง")
		} else if err != nil {
			return nil, fmt.Errorf("get payee account: %w", err)
		}
		w, err := s.warning(ctx, q, actor, to)
		if err != nil {
			return nil, err
		}
		related := uuid.NullUUID{}
		if w != nil {
			related = uuid.NullUUID{UUID: uuid.MustParse(w.DealID), Valid: true}
		}

		if status == db.TransferStatusCOMPLETEDSIMULATED {
			if err := s.move(ctx, q, from.ID, to, in.AmountSatang, now); err != nil {
				return nil, err
			}
		}
		id, err := q.InsertTransfer(ctx, db.InsertTransferParams{
			FromAccountID: from.ID, ToAccountID: to, AmountSatang: in.AmountSatang,
			Memo: pgtype.Text{String: in.Memo, Valid: in.Memo != ""}, Status: status,
			WarningShown: w != nil, RelatedDealID: related, CreatedAt: now,
		})
		if err != nil {
			return nil, fmt.Errorf("insert transfer: %w", err)
		}
		return dto.TransferDTO{ID: id.String(), Status: string(status), WarningShown: w != nil}, nil
	})
}

func (s *TransferService) move(ctx context.Context, q *db.Queries, from, to uuid.UUID, amount int64, now time.Time) error {
	accs, err := q.GetAccountsForUpdate(ctx, []uuid.UUID{from, to})
	if err != nil {
		return fmt.Errorf("lock accounts: %w", err)
	}
	for _, a := range accs {
		if a.ID == from && a.BalanceSatang-a.HeldSatang < amount {
			return domain.NewError(domain.CodeInsufficientBalance, "ยอดเงินที่ใช้ได้ไม่พอ")
		}
	}
	if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: from, BalanceDelta: -amount, Now: now}); err != nil {
		return fmt.Errorf("debit: %w", err)
	}
	if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: to, BalanceDelta: amount, Now: now}); err != nil {
		return fmt.Errorf("credit: %w", err)
	}
	return nil
}

func (s *TransferService) warning(ctx context.Context, q *db.Queries, actor domain.Actor, to uuid.UUID) (*dto.TransferWarningDTO, error) {
	d, err := q.FindOpenDealWithPayee(ctx, db.FindOpenDealWithPayeeParams{UserID: uuid.NullUUID{UUID: actor.UserID, Valid: true}, ToAccountID: to})
	if repository.IsNotFound(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find open deal: %w", err)
	}
	return &dto.TransferWarningDTO{
		Code: "OFF_DEAL_PAYMENT", DealID: d.ID.String(), UnitNo: d.UnitNo,
		Message: fmt.Sprintf("บัญชีนี้เป็นคู่ดีล %s ของคุณ (ห้อง %s) ที่ยังไม่จบ", brandName, d.UnitNo),
	}, nil
}
