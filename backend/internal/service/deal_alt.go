package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)


func (s *DealService) Cancel(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, version int32) (Response, error) {
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.findDeal(ctx, q, rawID, true)
		if err != nil {
			return nil, err
		}
		role, ok := partyRole(d, actor)
		if !ok {
			return nil, errNotParty()
		}
		next, err := s.checkTransition(d, domain.ActionCancel, role, version, now)
		if err != nil {
			return nil, err
		}
		mine, theirs := d.LandlordCancelRequestedAt, d.TenantCancelRequestedAt
		other := d.TenantID.UUID
		if role == domain.RoleTenant {
			mine, theirs, other = theirs, mine, d.LandlordID
		}
		if mine != nil {
			return nil, domain.NewError(domain.CodeDealStateConflict, "คุณขอยกเลิกไปแล้ว รออีกฝ่ายยินยอม")
		}

		params := db.UpdateDealCancelParams{ID: d.ID, Version: d.Version, State: d.State, Now: now}
		if role == domain.RoleLandlord {
			params.LandlordRequestedAt = &now
		} else {
			params.TenantRequestedAt = &now
		}
		me, err := q.GetUserByID(ctx, actor.UserID)
		if err != nil {
			return nil, fmt.Errorf("get user: %w", err)
		}
		prop, err := q.GetProperty(ctx, d.PropertyID)
		if err != nil {
			return nil, fmt.Errorf("get property: %w", err)
		}

		if theirs == nil {
			if err := s.updateCancel(ctx, q, params); err != nil {
				return nil, err
			}
			if err := addEvent(ctx, q, d.ID, db.DealEventTypeCANCELREQUESTED, actor.UserID, d.State, d.State, 0, now); err != nil {
				return nil, err
			}
			if err := notify(ctx, q, other, db.NotificationTypeCANCELREQUESTED, d.ID, "มีคำขอยกเลิกดีล",
				fmt.Sprintf("%s ขอยกเลิกดีลห้อง %s — ยินยอมเพื่อคืนเงินที่ยังกันไว้", me.ShortName, prop.UnitNo), now); err != nil {
				return nil, err
			}
			return s.reload(ctx, q, d.ID, role)
		}

		params.State = db.DealState(next[len(next)-1])
		if err := s.updateCancel(ctx, q, params); err != nil {
			return nil, err
		}
		refunded, err := s.refund(ctx, q, d, db.DealEventTypeDEALCANCELLED, db.DealStateCANCELLED,
			uuid.NullUUID{UUID: actor.UserID, Valid: true}, "cancel:"+d.ID.String(), now)
		if err != nil {
			return nil, err
		}
		for _, u := range []uuid.UUID{other, actor.UserID} {
			if err := notify(ctx, q, u, db.NotificationTypeDEALREFUNDED, d.ID, "ยกเลิกดีลแล้ว",
				fmt.Sprintf("ดีลห้อง %s ถูกยกเลิก · คืนเงินที่ยังกันไว้ %s ให้ผู้เช่าแล้ว", prop.UnitNo, bahtText(refunded)), now); err != nil {
				return nil, err
			}
		}
		return s.reload(ctx, q, d.ID, role)
	})
}

func (s *DealService) ReportIssue(ctx context.Context, actor domain.Actor, idem IdemRequest, rawID string, version int32) (Response, error) {
	now := s.clock.Now()
	return runIdempotent(ctx, s.repo, actor, idem, now, http.StatusOK, func(q *db.Queries) (any, error) {
		d, err := s.findDeal(ctx, q, rawID, true)
		if err != nil {
			return nil, err
		}
		if !d.TenantID.Valid || d.TenantID.UUID != actor.UserID {
			return nil, errNotParty()
		}
		state := domain.DealState(d.State)
		if !canReportIssue(state) || d.HasOpenIssue {
			return nil, domain.NewError(domain.CodeDealStateConflict, "แจ้งปัญหาดีลนี้ไม่ได้ในตอนนี้")
		}
		if version != d.Version {
			return nil, domain.NewError(domain.CodeVersionMismatch, "ดีลนี้มีการเปลี่ยนแปลง กรุณาลองใหม่")
		}
		n, err := q.MarkDealIssue(ctx, db.MarkDealIssueParams{ID: d.ID, Version: d.Version, Now: now})
		if err != nil {
			return nil, fmt.Errorf("mark issue: %w", err)
		}
		if n == 0 {
			return nil, domain.NewError(domain.CodeVersionMismatch, "ดีลนี้มีการเปลี่ยนแปลง กรุณาลองใหม่")
		}
		if err := addEvent(ctx, q, d.ID, db.DealEventTypeISSUEREPORTED, actor.UserID, d.State, d.State, 0, now); err != nil {
			return nil, err
		}
		return s.reload(ctx, q, d.ID, domain.RoleTenant)
	})
}

func (s *DealService) updateCancel(ctx context.Context, q *db.Queries, p db.UpdateDealCancelParams) error {
	n, err := q.UpdateDealCancel(ctx, p)
	if err != nil {
		return fmt.Errorf("update deal: %w", err)
	}
	if n == 0 {
		return domain.NewError(domain.CodeVersionMismatch, "ดีลนี้มีการเปลี่ยนแปลง กรุณาลองใหม่")
	}
	return nil
}

func (s *DealService) refund(ctx context.Context, q *db.Queries, d db.Deal, endEvent db.DealEventType, endState db.DealState,
	actor uuid.NullUUID, ledgerKey string, now time.Time) (int64, error) {
	var unreleased int64
	switch domain.DealState(d.State) {
	case domain.StateFundsLocked:
		unreleased = d.TotalSatang
	case domain.StateBookingFeeReleased:
		unreleased = d.MainDepositSatang // The released booking fee is not refundable.
	}
	actorID := uuid.Nil
	if actor.Valid {
		actorID = actor.UUID
	}
	if err := addEvent(ctx, q, d.ID, endEvent, actorID, d.State, endState, 0, now); err != nil {
		return 0, err
	}
	if unreleased == 0 {
		return 0, nil
	}
	if _, err := q.GetAccountsForUpdate(ctx, []uuid.UUID{d.TenantAccountID.UUID}); err != nil {
		return 0, fmt.Errorf("lock tenant account: %w", err)
	}
	if err := q.AdjustAccount(ctx, db.AdjustAccountParams{ID: d.TenantAccountID.UUID, HeldDelta: -unreleased, Now: now}); err != nil {
		return 0, fmt.Errorf("release hold: %w", err)
	}
	if err := q.InsertLedgerEvent(ctx, db.InsertLedgerEventParams{
		DealID: d.ID, EventType: db.LedgerEventTypeREFUND, AmountSatang: unreleased,
		FromAccountID: d.TenantAccountID, ActorID: actor, IdempotencyKey: ledgerKey, CreatedAt: now,
	}); err != nil {
		return 0, fmt.Errorf("insert ledger REFUND: %w", err)
	}
	if err := addEvent(ctx, q, d.ID, db.DealEventTypeFUNDSREFUNDED, actorID, endState, db.DealStateREFUNDED, unreleased, now); err != nil {
		return 0, err
	}
	return unreleased, nil
}
