package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/dto"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/token"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

const (
	// ยอดสูงสุดต่อดีล 1,000,000 บาท — กันตัวเลขผิดพลาด (ไม่ใช่กติกาธุรกิจ)
	maxDealSatang = 100_000_000
	// ดีลหมดอายุ = วันเข้าอยู่ + 2 วัน 23:59:59 (docs/04-database.md §5 ค่าเริ่มต้นฟอร์ม L2)
	expiryDaysAfterMoveIn = 2
	shareCodeAttempts     = 10
)

var (
	viewingChecklist = []string{"VIEWED_ROOM", "ROOM_MATCHES", "LANDLORD_MATCHES"}
	moveInChecklist  = []string{"GOT_KEYS", "ROOM_USABLE", "CONTRACT_SIGNED"}
)

// DealService: สร้างดีล คำเชิญ และ action ที่เปลี่ยน state/เงิน — ทุก action ที่เขียนอยู่ใน transaction เดียว
type DealService struct {
	repo       *repository.Repository
	clock      clock.Clock
	loc        *time.Location
	inviteTTL  time.Duration
	appBaseURL string
}

func NewDealService(repo *repository.Repository, c clock.Clock, loc *time.Location, inviteTTL time.Duration, appBaseURL string) *DealService {
	return &DealService{repo: repo, clock: c, loc: loc, inviteTTL: inviteTTL, appBaseURL: appBaseURL}
}

// ---- อ่าน ----

// Get — GET /deals/{id}: คู่ดีล · หรือผู้เช่าที่กำลังพิจารณาคำเชิญที่ยังใช้ได้ (preview ไม่มีข้อมูลผู้เช่า)
func (s *DealService) Get(ctx context.Context, actor domain.Actor, rawID string) (dto.DealDTO, error) {
	d, err := s.findDeal(ctx, s.repo.Queries, rawID, false)
	if err != nil {
		return dto.DealDTO{}, err
	}
	role, ok := partyRole(d, actor)
	if ok {
		return s.buildDealDTO(ctx, s.repo.Queries, d, role, viewOpts{})
	}
	// ผู้เช่าที่ยังไม่ได้ตอบคำเชิญ (T2 → T3) ยังไม่ใช่คู่ดีล แต่ต้องเห็นดีลเพื่อกันเงิน — ให้ดูแบบเดียวกับ /invites
	if actor.Role == domain.RoleTenant && !d.TenantID.Valid && domain.DealState(d.State) == domain.StateWaitingAccept {
		now := s.clock.Now()
		if _, err := s.repo.GetActiveInvite(ctx, db.GetActiveInviteParams{DealID: d.ID, Now: now}); err == nil && now.Before(d.ExpiresAt) {
			return s.buildDealDTO(ctx, s.repo.Queries, d, domain.RoleTenant, viewOpts{invitePreview: true})
		} else if err != nil && !repository.IsNotFound(err) {
			return dto.DealDTO{}, fmt.Errorf("get active invite: %w", err)
		}
	}
	return dto.DealDTO{}, errNotParty()
}

// List — GET /deals?status=active|closed
func (s *DealService) List(ctx context.Context, actor domain.Actor, status string) (dto.DealListDTO, error) {
	if status != "" && status != "active" && status != "closed" {
		return dto.DealListDTO{}, invalid("status", "active | closed", "ตัวกรองไม่ถูกต้อง")
	}
	rows, err := s.repo.ListDealsForUser(ctx, actor.UserID)
	if err != nil {
		return dto.DealListDTO{}, fmt.Errorf("list deals: %w", err)
	}
	out := dto.DealListDTO{Items: []dto.DealSummaryDTO{}}
	for _, r := range rows {
		active := IsActive(domain.DealState(r.State))
		if (status == "active" && !active) || (status == "closed" && active) {
			continue
		}
		role := domain.RoleTenant
		if r.LandlordID == actor.UserID {
			role = domain.RoleLandlord
		}
		out.Items = append(out.Items, dto.DealSummaryDTO{
			ID: r.ID.String(), RefNo: r.RefNo, State: string(r.State), ProjectName: r.ProjectName, UnitNo: r.UnitNo,
			TotalSatang: r.TotalSatang, MyRole: string(role), CreatedAt: iso(r.CreatedAt, s.loc),
		})
	}
	return out, nil
}

// PreviewInvite — GET /invites/{codeOrToken} (T2): ผู้เช่าเปิดดีลจากรหัสที่พิมพ์/สแกน หรือ token ใน QR
func (s *DealService) PreviewInvite(ctx context.Context, actor domain.Actor, code string) (dto.DealDTO, error) {
	q := s.repo.Queries
	now := s.clock.Now()

	var d db.Deal
	var inviteExpired bool
	if token.IsShareCode(code) {
		deal, err := q.GetDealByShareCode(ctx, code)
		if repository.IsNotFound(err) {
			return dto.DealDTO{}, errNotFound()
		} else if err != nil {
			return dto.DealDTO{}, fmt.Errorf("get deal by code: %w", err)
		}
		d = deal
		if _, err := q.GetActiveInvite(ctx, db.GetActiveInviteParams{DealID: d.ID, Now: now}); repository.IsNotFound(err) {
			inviteExpired = true
		} else if err != nil {
			return dto.DealDTO{}, fmt.Errorf("get active invite: %w", err)
		}
	} else {
		inv, err := q.GetInviteByTokenHash(ctx, token.HashInvite(code))
		if repository.IsNotFound(err) {
			return dto.DealDTO{}, errNotFound()
		} else if err != nil {
			return dto.DealDTO{}, fmt.Errorf("get invite: %w", err)
		}
		inviteExpired = inv.RevokedAt != nil || !now.Before(inv.ExpiresAt)
		if d, err = q.GetDeal(ctx, inv.DealID); err != nil {
			return dto.DealDTO{}, fmt.Errorf("get deal: %w", err)
		}
	}

	// ผู้เช่าของดีลนี้แล้ว (เปิด QR เดิมซ้ำหลังกันเงิน) → เห็นดีลเต็ม
	if d.TenantID.Valid && d.TenantID.UUID == actor.UserID {
		return s.buildDealDTO(ctx, q, d, domain.RoleTenant, viewOpts{})
	}
	if domain.DealState(d.State) != domain.StateWaitingAccept {
		return dto.DealDTO{}, errNotFound()
	}
	if inviteExpired || !now.Before(d.ExpiresAt) {
		return dto.DealDTO{}, domain.NewError(domain.CodeInviteExpired, "คำเชิญนี้หมดอายุแล้ว")
	}
	return s.buildDealDTO(ctx, q, d, domain.RoleTenant, viewOpts{invitePreview: true})
}

// LookupTenant — GET /users/lookup?phone= (D10): คืนแค่ชื่อย่อ ไม่เปิดเผยข้อมูลอื่น
func (s *DealService) LookupTenant(ctx context.Context, phone string) (dto.UserLookupDTO, error) {
	u, err := s.findTenantByPhone(ctx, s.repo.Queries, phone)
	if err != nil {
		return dto.UserLookupDTO{}, err
	}
	return dto.UserLookupDTO{ShortName: u.ShortName}, nil
}

// ---- เขียน (idempotent) ----

type CreateDealInput struct {
	PropertyID       string
	TotalSatang      int64
	BookingFeeSatang int64
	ViewingAt        string
	MoveInDate       string
}

// Create — POST /deals (L3): ดีลเกิดเป็น WAITING_ACCEPT ทันที + คำเชิญ QR
func (s *DealService) Create(ctx context.Context, actor domain.Actor, idem IdemRequest, in CreateDealInput) (Response, error) {
	now := s.clock.Now()
	propID, viewingAt, moveIn, err := s.validateCreate(in, now)
	if err != nil {
		return Response{}, err
	}
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusCreated, func(q *db.Queries) (any, error) {
		prop, err := q.GetProperty(ctx, propID)
		if repository.IsNotFound(err) || (err == nil && prop.LandlordID != actor.UserID) {
			return nil, invalid("propertyId", "not your property", "ไม่พบห้องนี้ในบัญชีของคุณ")
		} else if err != nil {
			return nil, fmt.Errorf("get property: %w", err)
		}
		acc, err := q.GetPrimaryAccount(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get landlord account: %w", err)
		}

		local := now.In(s.loc)
		seq, err := q.NextRefSeq(ctx, pgtype.Date{Time: time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC), Valid: true})
		if err != nil {
			return nil, fmt.Errorf("next ref seq: %w", err)
		}
		code, err := s.newShareCode(ctx, q)
		if err != nil {
			return nil, err
		}

		my, mm, md := moveIn.Date()
		dealID, err := q.InsertDeal(ctx, db.InsertDealParams{
			RefNo: token.FormatRefNo(local, seq), ShareCode: code,
			LandlordID: actor.UserID, LandlordAccountID: acc.ID, PropertyID: prop.ID,
			TotalSatang: in.TotalSatang, BookingFeeSatang: in.BookingFeeSatang, MainDepositSatang: in.TotalSatang - in.BookingFeeSatang,
			ViewingAt: viewingAt, MoveInDate: pgtype.Date{Time: moveIn, Valid: true},
			ExpiresAt: time.Date(my, mm, md+expiryDaysAfterMoveIn, 23, 59, 59, 0, s.loc),
			State:     db.DealStateWAITINGACCEPT, Version: 1, CreatedAt: now,
		})
		if err != nil {
			return nil, fmt.Errorf("insert deal: %w", err)
		}
		d, err := q.GetDeal(ctx, dealID)
		if err != nil {
			return nil, fmt.Errorf("get deal: %w", err)
		}
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeDEALCREATED, actor.UserID, "", db.DealStateWAITINGACCEPT, 0, now); err != nil {
			return nil, err
		}
		qrURL, err := s.issueQRInvite(ctx, q, d.ID, now)
		if err != nil {
			return nil, err
		}
		return s.buildDealDTO(ctx, q, d, domain.RoleLandlord, viewOpts{qrURL: qrURL})
	})
}

// ReissueInvite — POST /deals/{id}/invite (L4): ออก QR ใหม่ อันเก่าใช้ไม่ได้ทันที
func (s *DealService) ReissueInvite(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string) (Response, error) {
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.landlordWaitingDeal(ctx, q, actor, rawID, now)
		if err != nil {
			return nil, err
		}
		if err := q.RevokeInvites(ctx, db.RevokeInvitesParams{DealID: d.ID, Now: &now}); err != nil {
			return nil, fmt.Errorf("revoke invites: %w", err)
		}
		qrURL, err := s.issueQRInvite(ctx, q, d.ID, now)
		if err != nil {
			return nil, err
		}
		return s.buildDealDTO(ctx, q, d, domain.RoleLandlord, viewOpts{qrURL: qrURL})
	})
}

type SendInviteInput struct {
	Channel string // IN_APP (ค่าเริ่มต้น) | PHONE
	Phone   string
}

// SendInvite — POST /deals/{id}/invite/send (L4 "ส่งเข้าแอปผู้เช่า", D10)
func (s *DealService) SendInvite(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, in SendInviteInput) (Response, error) {
	now := s.clock.Now()
	channel := db.InviteChannelINAPP
	switch in.Channel {
	case "", "IN_APP":
	case "PHONE":
		channel = db.InviteChannelPHONE
	default:
		return Response{}, invalid("channel", "IN_APP | PHONE", "ช่องทางส่งไม่ถูกต้อง")
	}
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.landlordWaitingDeal(ctx, q, actor, rawID, now)
		if err != nil {
			return nil, err
		}
		var target db.User
		switch {
		case channel == db.InviteChannelPHONE:
			target, err = s.findTenantByPhone(ctx, q, in.Phone)
		case d.TenantID.Valid:
			target, err = q.GetUserByID(ctx, d.TenantID.UUID)
		default:
			target, err = q.GetDefaultTenant(ctx)
		}
		if err != nil {
			return nil, err
		}
		landlord, err := q.GetUserByID(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get landlord: %w", err)
		}

		// คำเชิญแบบระบุผู้รับ (token ไม่ได้ใช้ — ผู้เช่าเปิดจากการ์ดในแอปด้วย share code)
		_, hash := token.NewInvite()
		if err := q.InsertDealInvite(ctx, db.InsertDealInviteParams{
			DealID: d.ID, TokenHash: hash, Channel: channel, TargetUserID: uuid.NullUUID{UUID: target.ID, Valid: true},
			ExpiresAt: now.Add(s.inviteTTL), CreatedAt: now,
		}); err != nil {
			return nil, fmt.Errorf("insert invite: %w", err)
		}
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeINVITESENT, actor.UserID, db.DealStateWAITINGACCEPT, db.DealStateWAITINGACCEPT, 0, now); err != nil {
			return nil, err
		}
		if err := notify(ctx, q, target.ID, db.NotificationTypeDEALINVITE, d.ID,
			"คำขอ "+brandName+" ใหม่", "จากคุณ"+landlord.ShortName, now); err != nil {
			return nil, err
		}
		var out dto.InviteSentDTO
		out.SentTo.ShortName = target.ShortName
		out.SentAt = iso(now, s.loc)
		return out, nil
	})
}

// Reject — POST /deals/{id}/reject (T2): WAITING_ACCEPT → REJECTED
func (s *DealService) Reject(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, version int32) (Response, error) {
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.findDeal(ctx, q, rawID, true)
		if err != nil {
			return nil, err
		}
		if d.TenantID.Valid && d.TenantID.UUID != actor.UserID {
			return nil, errNotParty()
		}
		next, err := s.checkTransition(d, domain.ActionReject, actor.Role, version, now)
		if err != nil {
			return nil, err
		}
		tenant, err := q.GetUserByID(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get tenant: %w", err)
		}
		acc, err := q.GetPrimaryAccount(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get tenant account: %w", err)
		}
		// ผูกผู้เช่ากับดีล เพื่อให้เปิดดูผลลัพธ์ (D3) ได้
		if err := s.setState(ctx, q, d, next, now, uuid.NullUUID{UUID: actor.UserID, Valid: true}, uuid.NullUUID{UUID: acc.ID, Valid: true}); err != nil {
			return nil, err
		}
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeDEALREJECTED, actor.UserID, db.DealState(d.State), db.DealStateREJECTED, 0, now); err != nil {
			return nil, err
		}
		if err := s.closeInvites(ctx, q, d.ID, actor.UserID, now); err != nil {
			return nil, err
		}
		prop, err := q.GetProperty(ctx, d.PropertyID)
		if err != nil {
			return nil, fmt.Errorf("get property: %w", err)
		}
		if err := notify(ctx, q, d.LandlordID, db.NotificationTypeDEALREJECTED, d.ID,
			"ผู้เช่าปฏิเสธดีล", tenant.ShortName+" ปฏิเสธดีลห้อง "+prop.UnitNo, now); err != nil {
			return nil, err
		}
		return s.reload(ctx, q, d.ID, domain.RoleTenant)
	})
}

type LockInput struct {
	Version    int32
	InviteCode string // share code หรือ token จาก QR — ยืนยันว่าผู้เช่าได้รับคำเชิญของดีลนี้จริง
	Method     string // FACE_ID | PIN — เก็บเป็นข้อมูลประกอบเท่านั้น ไม่มีค่า PIN
}

// Lock — POST /deals/{id}/lock (T3): ยอมรับ + กันเงิน WAITING_ACCEPT → FUNDS_LOCKED (docs/04-database.md §6.1)
func (s *DealService) Lock(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, in LockInput) (Response, error) {
	if in.Method != "FACE_ID" && in.Method != "PIN" {
		return Response{}, invalid("method", "FACE_ID | PIN", "วิธียืนยันตัวตนไม่ถูกต้อง")
	}
	if in.InviteCode == "" {
		return Response{}, invalid("inviteCode", "required", "ไม่พบรหัสคำเชิญ")
	}
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.findDeal(ctx, q, rawID, true)
		if err != nil {
			return nil, err
		}
		if d.TenantID.Valid && d.TenantID.UUID != actor.UserID {
			return nil, errNotParty()
		}
		next, err := s.checkTransition(d, domain.ActionLock, actor.Role, in.Version, now)
		if err != nil {
			return nil, err
		}
		if err := s.checkInviteCode(ctx, q, d, in.InviteCode, now); err != nil {
			return nil, err
		}

		acc, err := q.GetPrimaryAccountForUpdate(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("lock tenant account: %w", err)
		}
		if acc.BalanceSatang-acc.HeldSatang < d.TotalSatang {
			// ยังไม่ได้เขียนอะไร — rollback แล้วไม่มี ledger event
			return nil, domain.NewError(domain.CodeInsufficientBalance, "ยอดเงินที่ใช้ได้ไม่พอสำหรับกันเงิน")
		}
		tenantAcc := uuid.NullUUID{UUID: acc.ID, Valid: true}

		if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: acc.ID, HeldDelta: d.TotalSatang, Now: now}); err != nil {
			return nil, fmt.Errorf("hold funds: %w", err)
		}
		if err := addLedger(ctx, q, d.ID, db.LedgerEventTypeHOLD, d.TotalSatang, tenantAcc, uuid.NullUUID{}, actor.UserID, idem.Key, now); err != nil {
			return nil, err
		}
		if err := s.setState(ctx, q, d, next, now, uuid.NullUUID{UUID: actor.UserID, Valid: true}, tenantAcc); err != nil {
			return nil, err
		}
		from := db.DealState(d.State)
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeDEALACCEPTED, actor.UserID, from, from, 0, now); err != nil {
			return nil, err
		}
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeFUNDSLOCKED, actor.UserID, from, db.DealStateFUNDSLOCKED, d.TotalSatang, now); err != nil {
			return nil, err
		}
		if err := s.closeInvites(ctx, q, d.ID, actor.UserID, now); err != nil {
			return nil, err
		}
		tenant, prop, err := tenantAndProperty(ctx, q, actor.UserID, d.PropertyID)
		if err != nil {
			return nil, err
		}
		if err := notify(ctx, q, d.LandlordID, db.NotificationTypeFUNDSLOCKED, d.ID, "เงินถูกกันไว้แล้ว",
			fmt.Sprintf("%s กันเงิน %s สำหรับห้อง %s", tenant.ShortName, bahtText(d.TotalSatang), prop.UnitNo), now); err != nil {
			return nil, err
		}

		out, err := s.reload(ctx, q, d.ID, domain.RoleTenant)
		if err != nil {
			return nil, err
		}
		after, err := q.GetAccount(ctx, acc.ID)
		if err != nil {
			return nil, fmt.Errorf("get tenant account: %w", err)
		}
		out.Account = &dto.AccountBalanceDTO{AvailableSatang: after.BalanceSatang - after.HeldSatang, HeldSatang: after.HeldSatang}
		return out, nil
	})
}

type ConfirmInput struct {
	Version   int32
	Checklist []string
}

// ConfirmViewing — POST /deals/{id}/confirm-viewing (T5): ปล่อยค่าจอง (docs/04-database.md §6.2)
func (s *DealService) ConfirmViewing(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, in ConfirmInput) (Response, error) {
	return s.release(ctx, actor, idem, rawID, in, releaseSpec{
		action: domain.ActionConfirmViewing, checklist: viewingChecklist,
		ledger: db.LedgerEventTypeRELEASEBOOKINGFEE, confirmEvent: db.DealEventTypeVIEWINGCONFIRMED,
		releaseEvent: db.DealEventTypeBOOKINGFEERELEASED, notification: db.NotificationTypeBOOKINGFEERELEASED,
		amount: func(d db.Deal) int64 { return d.BookingFeeSatang },
		title:  func(d db.Deal) string { return "ได้รับค่าจอง " + bahtText(d.BookingFeeSatang) },
		body: func(tenant, unit string) string {
			return tenant + " ยืนยันดูห้อง " + unit + " แล้ว"
		},
	})
}

// ConfirmMoveIn — POST /deals/{id}/confirm-move-in (T6): ปล่อยมัดจำหลัก (docs/04-database.md §6.3)
func (s *DealService) ConfirmMoveIn(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, in ConfirmInput) (Response, error) {
	return s.release(ctx, actor, idem, rawID, in, releaseSpec{
		action: domain.ActionConfirmMoveIn, checklist: moveInChecklist,
		ledger: db.LedgerEventTypeRELEASEMAINDEPOSIT, confirmEvent: db.DealEventTypeMOVEINCONFIRMED,
		releaseEvent: db.DealEventTypeMAINDEPOSITRELEASED, notification: db.NotificationTypeMAINDEPOSITRELEASED,
		amount: func(d db.Deal) int64 { return d.MainDepositSatang },
		title: func(d db.Deal) string {
			return "ได้รับเงินครบแล้ว " + bahtText(d.TotalSatang)
		},
		body: func(tenant, unit string) string {
			return tenant + " ยืนยันเข้าอยู่ห้อง " + unit + " แล้ว"
		},
	})
}

type releaseSpec struct {
	action       domain.Action
	checklist    []string
	ledger       db.LedgerEventType
	confirmEvent db.DealEventType
	releaseEvent db.DealEventType
	notification db.NotificationType
	amount       func(db.Deal) int64
	title        func(db.Deal) string
	body         func(tenant, unit string) string
}

// release ปล่อยเงินงวดหนึ่งจากผู้เช่าไปผู้ให้เช่า — กดครั้งเดียวผ่าน 2 state ใน transaction เดียว
func (s *DealService) release(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, in ConfirmInput, spec releaseSpec) (Response, error) {
	if !sameSet(in.Checklist, spec.checklist) {
		// ตรวจฝั่ง server ด้วย กันการยิง API ข้ามหน้าจอที่ต้องติ๊กครบ
		return Response{}, invalid("checklist", strings.Join(spec.checklist, ", "), "กรุณายืนยันให้ครบทุกข้อ")
	}
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.findDeal(ctx, q, rawID, true)
		if err != nil {
			return nil, err
		}
		if !d.TenantID.Valid || d.TenantID.UUID != actor.UserID {
			return nil, errNotParty()
		}
		next, err := s.checkTransition(d, spec.action, actor.Role, in.Version, now)
		if err != nil {
			return nil, err
		}

		// ล็อกสองบัญชีเรียงตาม id (กัน deadlock)
		ids := []uuid.UUID{d.TenantAccountID.UUID, d.LandlordAccountID}
		if _, err := q.GetAccountsForUpdate(ctx, ids); err != nil {
			return nil, fmt.Errorf("lock accounts: %w", err)
		}
		amount := spec.amount(d)
		if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: d.TenantAccountID.UUID, BalanceDelta: -amount, HeldDelta: -amount, Now: now}); err != nil {
			return nil, fmt.Errorf("debit tenant: %w", err)
		}
		if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: d.LandlordAccountID, BalanceDelta: amount, Now: now}); err != nil {
			return nil, fmt.Errorf("credit landlord: %w", err)
		}
		if err := addLedger(ctx, q, d.ID, spec.ledger, amount, d.TenantAccountID,
			uuid.NullUUID{UUID: d.LandlordAccountID, Valid: true}, actor.UserID, idem.Key, now); err != nil {
			return nil, err
		}
		if err := s.setState(ctx, q, d, next, now, uuid.NullUUID{}, uuid.NullUUID{}); err != nil {
			return nil, err
		}
		mid, final := db.DealState(next[0]), db.DealState(next[1])
		if err := addEvent(ctx, q, d.ID, spec.confirmEvent, actor.UserID, db.DealState(d.State), mid, 0, now); err != nil {
			return nil, err
		}
		if err := addEvent(ctx, q, d.ID, spec.releaseEvent, actor.UserID, mid, final, amount, now); err != nil {
			return nil, err
		}
		tenant, prop, err := tenantAndProperty(ctx, q, actor.UserID, d.PropertyID)
		if err != nil {
			return nil, err
		}
		if err := notify(ctx, q, d.LandlordID, spec.notification, d.ID, spec.title(d), spec.body(tenant.ShortName, prop.UnitNo), now); err != nil {
			return nil, err
		}
		return s.reload(ctx, q, d.ID, domain.RoleTenant)
	})
}

// ---- helpers ----

// findDeal หาดีลจาก id ใน path · forUpdate = ล็อกแถวจนจบ transaction
func (s *DealService) findDeal(ctx context.Context, q *db.Queries, rawID string, forUpdate bool) (db.Deal, error) {
	id, err := uuid.Parse(rawID)
	if err != nil {
		return db.Deal{}, errNotFound()
	}
	var d db.Deal
	if forUpdate {
		d, err = q.GetDealForUpdate(ctx, id)
	} else {
		d, err = q.GetDeal(ctx, id)
	}
	if repository.IsNotFound(err) {
		return db.Deal{}, errNotFound()
	}
	if err != nil {
		return db.Deal{}, fmt.Errorf("get deal: %w", err)
	}
	return d, nil
}

// checkTransition ตรวจหลังได้ lock แล้ว ตามลำดับ: state → version → วันหมดอายุ
// (state ก่อน version: กดปล่อยซ้ำหลังปล่อยแล้วต้องได้ DEAL_STATE_CONFLICT ตาม docs/05-api.md)
func (s *DealService) checkTransition(d db.Deal, action domain.Action, role domain.Role, v int32, now time.Time) ([]domain.DealState, error) {
	next, err := NextStates(domain.DealState(d.State), action, role)
	if err != nil {
		return nil, err
	}
	if v != d.Version {
		return nil, domain.NewError(domain.CodeVersionMismatch, "ดีลนี้มีการเปลี่ยนแปลง กรุณาลองใหม่")
	}
	if !now.Before(d.ExpiresAt) {
		return nil, domain.NewError(domain.CodeInviteExpired, "ดีลนี้หมดอายุแล้ว")
	}
	return next, nil
}

// setState เขียน state สุดท้ายของ transition + version+1 (หนึ่ง action = หนึ่ง version)
func (s *DealService) setState(ctx context.Context, q *db.Queries, d db.Deal, next []domain.DealState, now time.Time, tenantID, tenantAcc uuid.NullUUID) error {
	n, err := q.UpdateDealState(ctx, db.UpdateDealStateParams{
		ID: d.ID, Version: d.Version, State: db.DealState(next[len(next)-1]), Now: now,
		TenantID: tenantID, TenantAccountID: tenantAcc,
	})
	if err != nil {
		return fmt.Errorf("update deal: %w", err)
	}
	if n == 0 {
		return domain.NewError(domain.CodeVersionMismatch, "ดีลนี้มีการเปลี่ยนแปลง กรุณาลองใหม่")
	}
	return nil
}

func (s *DealService) reload(ctx context.Context, q *db.Queries, id uuid.UUID, role domain.Role) (dto.DealDTO, error) {
	d, err := q.GetDeal(ctx, id)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("reload deal: %w", err)
	}
	return s.buildDealDTO(ctx, q, d, role, viewOpts{})
}

// landlordWaitingDeal = ดีลของผู้ให้เช่าคนนี้ที่ยังรอผู้เช่า และยังไม่หมดอายุ
func (s *DealService) landlordWaitingDeal(ctx context.Context, q *db.Queries, actor domain.Actor, rawID string, now time.Time) (db.Deal, error) {
	d, err := s.findDeal(ctx, q, rawID, true)
	if err != nil {
		return db.Deal{}, err
	}
	if d.LandlordID != actor.UserID {
		return db.Deal{}, errNotParty()
	}
	if domain.DealState(d.State) != domain.StateWaitingAccept {
		return db.Deal{}, domain.NewError(domain.CodeDealStateConflict, "ดีลนี้ไม่อยู่ในสถานะที่ทำรายการนี้ได้")
	}
	if !now.Before(d.ExpiresAt) {
		return db.Deal{}, domain.NewError(domain.CodeInviteExpired, "ดีลนี้หมดอายุแล้ว")
	}
	return d, nil
}

// checkInviteCode ยืนยันว่ารหัส (share code หรือ token) เป็นคำเชิญที่ยังใช้ได้ของดีลนี้
func (s *DealService) checkInviteCode(ctx context.Context, q *db.Queries, d db.Deal, code string, now time.Time) error {
	if token.IsShareCode(code) {
		if code != d.ShareCode {
			return domain.NewError(domain.CodeNotDealParty, "คำเชิญไม่ตรงกับดีลนี้")
		}
		if _, err := q.GetActiveInvite(ctx, db.GetActiveInviteParams{DealID: d.ID, Now: now}); repository.IsNotFound(err) {
			return domain.NewError(domain.CodeInviteExpired, "คำเชิญนี้หมดอายุแล้ว")
		} else if err != nil {
			return fmt.Errorf("get active invite: %w", err)
		}
		return nil
	}
	inv, err := q.GetInviteByTokenHash(ctx, token.HashInvite(code))
	if repository.IsNotFound(err) || (err == nil && inv.DealID != d.ID) {
		return domain.NewError(domain.CodeNotDealParty, "คำเชิญไม่ตรงกับดีลนี้")
	} else if err != nil {
		return fmt.Errorf("get invite: %w", err)
	}
	if inv.RevokedAt != nil || !now.Before(inv.ExpiresAt) {
		return domain.NewError(domain.CodeInviteExpired, "คำเชิญนี้หมดอายุแล้ว")
	}
	return nil
}

// issueQRInvite สร้างคำเชิญ QR ใหม่ คืน URL ที่มี token (ครั้งเดียว — DB เก็บแค่ hash)
func (s *DealService) issueQRInvite(ctx context.Context, q *db.Queries, dealID uuid.UUID, now time.Time) (string, error) {
	tok, hash := token.NewInvite()
	if err := q.InsertDealInvite(ctx, db.InsertDealInviteParams{
		DealID: dealID, TokenHash: hash, Channel: db.InviteChannelQR, ExpiresAt: now.Add(s.inviteTTL), CreatedAt: now,
	}); err != nil {
		return "", fmt.Errorf("insert invite: %w", err)
	}
	return s.appBaseURL + "/invites/" + tok, nil
}

// closeInvites: ดีลถูกตอบแล้ว → คำเชิญทั้งหมดใช้ไม่ได้ และการ์ดคำขอของผู้เช่าถือว่าอ่านแล้ว
func (s *DealService) closeInvites(ctx context.Context, q *db.Queries, dealID, tenantID uuid.UUID, now time.Time) error {
	if err := q.RevokeInvites(ctx, db.RevokeInvitesParams{DealID: dealID, Now: &now}); err != nil {
		return fmt.Errorf("revoke invites: %w", err)
	}
	if err := q.MarkDealNotificationsRead(ctx, db.MarkDealNotificationsReadParams{
		UserID: tenantID, DealID: uuid.NullUUID{UUID: dealID, Valid: true}, Type: db.NotificationTypeDEALINVITE, Now: &now,
	}); err != nil {
		return fmt.Errorf("mark invite read: %w", err)
	}
	return nil
}

func (s *DealService) newShareCode(ctx context.Context, q *db.Queries) (string, error) {
	for range shareCodeAttempts {
		code := token.NewShareCode()
		taken, err := q.ShareCodeExists(ctx, code)
		if err != nil {
			return "", fmt.Errorf("check share code: %w", err)
		}
		if !taken {
			return code, nil
		}
	}
	return "", errors.New("could not find a free share code")
}

func (s *DealService) findTenantByPhone(ctx context.Context, q *db.Queries, phone string) (db.User, error) {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)
	if len(digits) != 10 {
		return db.User{}, invalid("phone", "10 digits", "เบอร์มือถือไม่ถูกต้อง")
	}
	u, err := q.GetUserByPhone(ctx, pgtype.Text{String: digits, Valid: true})
	if repository.IsNotFound(err) || (err == nil && u.Role != db.UserRoleTENANT) {
		return db.User{}, domain.NewError(domain.CodeNotFound, "ไม่พบผู้เช่าที่ใช้เบอร์นี้")
	}
	if err != nil {
		return db.User{}, fmt.Errorf("get user by phone: %w", err)
	}
	return u, nil
}

func (s *DealService) validateCreate(in CreateDealInput, now time.Time) (uuid.UUID, time.Time, time.Time, error) {
	var details []domain.FieldError
	add := func(field, msg string) { details = append(details, domain.FieldError{Field: field, Message: msg}) }

	propID, err := uuid.Parse(in.PropertyID)
	if err != nil {
		add("propertyId", "must be a UUID")
	}
	if in.TotalSatang <= 0 || in.TotalSatang > maxDealSatang {
		add("totalSatang", fmt.Sprintf("must be between 1 and %d", maxDealSatang))
	}
	if in.BookingFeeSatang <= 0 || in.BookingFeeSatang >= in.TotalSatang {
		add("bookingFeeSatang", "must be more than 0 and less than totalSatang")
	}
	viewingAt, err := time.Parse(time.RFC3339, in.ViewingAt)
	if err != nil {
		add("viewingAt", "must be ISO-8601 with offset")
	} else if !viewingAt.After(now) {
		add("viewingAt", "must be in the future")
	}
	moveIn, err := time.ParseInLocation("2006-01-02", in.MoveInDate, s.loc)
	if err != nil {
		add("moveInDate", "must be YYYY-MM-DD")
	} else if !viewingAt.IsZero() {
		vy, vm, vd := viewingAt.In(s.loc).Date()
		if moveIn.Before(time.Date(vy, vm, vd, 0, 0, 0, 0, s.loc)) {
			add("moveInDate", "must be on or after the viewing date")
		}
	}
	if len(details) > 0 {
		return uuid.Nil, time.Time{}, time.Time{}, &domain.AppError{
			Code: domain.CodeValidationFailed, Message: "ข้อมูลดีลไม่ถูกต้อง", Details: details,
		}
	}
	return propID, viewingAt, moveIn, nil
}

// partyRole บอกว่า actor เป็นฝ่ายไหนของดีล (ไม่ใช่คู่ดีล = false)
func partyRole(d db.Deal, actor domain.Actor) (domain.Role, bool) {
	switch {
	case d.LandlordID == actor.UserID:
		return domain.RoleLandlord, true
	case d.TenantID.Valid && d.TenantID.UUID == actor.UserID:
		return domain.RoleTenant, true
	default:
		return "", false
	}
}

func tenantAndProperty(ctx context.Context, q *db.Queries, tenantID, propID uuid.UUID) (db.User, db.Property, error) {
	tenant, err := q.GetUserByID(ctx, tenantID)
	if err != nil {
		return db.User{}, db.Property{}, fmt.Errorf("get tenant: %w", err)
	}
	prop, err := q.GetProperty(ctx, propID)
	if err != nil {
		return db.User{}, db.Property{}, fmt.Errorf("get property: %w", err)
	}
	return tenant, prop, nil
}

func addEvent(ctx context.Context, q *db.Queries, dealID uuid.UUID, typ db.DealEventType, actor uuid.UUID,
	from, to db.DealState, amount int64, at time.Time) error {
	if err := q.InsertDealEvent(ctx, db.InsertDealEventParams{
		DealID: dealID, EventType: typ, ActorID: uuid.NullUUID{UUID: actor, Valid: actor != uuid.Nil},
		FromState:    db.NullDealState{DealState: from, Valid: from != ""},
		ToState:      db.NullDealState{DealState: to, Valid: to != ""},
		AmountSatang: pgtype.Int8{Int64: amount, Valid: amount > 0}, CreatedAt: at,
	}); err != nil {
		return fmt.Errorf("insert event %s: %w", typ, err)
	}
	return nil
}

func addLedger(ctx context.Context, q *db.Queries, dealID uuid.UUID, typ db.LedgerEventType, amount int64,
	from, to uuid.NullUUID, actor uuid.UUID, idemKey string, at time.Time) error {
	if err := q.InsertLedgerEvent(ctx, db.InsertLedgerEventParams{
		DealID: dealID, EventType: typ, AmountSatang: amount, FromAccountID: from, ToAccountID: to,
		ActorID: uuid.NullUUID{UUID: actor, Valid: true}, IdempotencyKey: idemKey, CreatedAt: at,
	}); err != nil {
		// UNIQUE (deal_id, event_type) คือด่านสุดท้าย — ถ้าชนแปลว่าเงินงวดนี้ถูกปล่อยไปแล้ว
		return fmt.Errorf("insert ledger %s: %w", typ, err)
	}
	return nil
}

func notify(ctx context.Context, q *db.Queries, user uuid.UUID, typ db.NotificationType, dealID uuid.UUID, title, body string, at time.Time) error {
	if err := q.InsertNotification(ctx, db.InsertNotificationParams{
		UserID: user, Type: typ, DealID: uuid.NullUUID{UUID: dealID, Valid: true}, Title: title, Body: body, CreatedAt: at,
	}); err != nil {
		return fmt.Errorf("insert notification %s: %w", typ, err)
	}
	return nil
}

// bahtText = ยอดสำหรับข้อความแจ้งเตือน: 650000 → "6,500" · 123450 → "1,234.50"
func bahtText(satang int64) string {
	baht, frac := satang/100, satang%100
	s := fmt.Sprintf("%d", baht)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	if frac != 0 {
		s += fmt.Sprintf(".%02d", frac)
	}
	return s
}

func sameSet(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for _, w := range want {
		if !slices.Contains(got, w) {
			return false
		}
	}
	return true
}

func invalid(field, detail, message string) *domain.AppError {
	return &domain.AppError{
		Code: domain.CodeValidationFailed, Message: message,
		Details: []domain.FieldError{{Field: field, Message: detail}},
	}
}

func errNotFound() *domain.AppError {
	return domain.NewError(domain.CodeNotFound, "ไม่พบดีลนี้")
}

func errNotParty() *domain.AppError {
	return domain.NewError(domain.CodeNotDealParty, "คุณไม่ใช่คู่ดีลของรายการนี้")
}
