package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/repository"
	"github.com/suphanatchanlek30/psure/backend/internal/repository/db"
)


func (s *DealService) RunExpiryWorker(ctx context.Context, tick time.Duration, log *slog.Logger) {
	t := time.NewTicker(tick)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			n, err := s.ExpireDue(ctx)
			if err != nil {
				log.Error("expiry worker", "error", err.Error())
			} else if n > 0 {
				log.Info("expiry worker", "expired", n)
			}
		}
	}
}

func (s *DealService) ExpireDue(ctx context.Context) (int, error) {
	ids, err := s.repo.ListDueDeals(ctx, s.clock.Now())
	if err != nil {
		return 0, fmt.Errorf("list due deals: %w", err)
	}
	expired := 0
	var errs []error
	for _, id := range ids {
		ok, err := s.expireOne(ctx, id, false)
		if err != nil {
			errs = append(errs, fmt.Errorf("expire %s: %w", id, err))
			continue
		}
		if ok {
			expired++
		}
	}
	return expired, errors.Join(errs...)
}

func (s *DealService) ExpireNow(ctx context.Context, actor domain.Actor, rawID string) error {
	d, err := s.findDeal(ctx, s.repo.Queries, actor, rawID, false)
	if err != nil {
		return err
	}
	ok, err := s.expireOne(ctx, d.ID, true)
	if err != nil {
		return err
	}
	if !ok {
		return domain.NewError(domain.CodeDealStateConflict, "ดีลนี้จบไปแล้ว หรือกำลังมีการทำรายการอยู่")
	}
	return nil
}

func (s *DealService) expireOne(ctx context.Context, id uuid.UUID, force bool) (bool, error) {
	done := false
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		d, err := q.GetDealForUpdateSkipLocked(ctx, id)
		if repository.IsNotFound(err) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("lock deal: %w", err)
		}
		now := s.clock.Now()
		state := domain.DealState(d.State)
		if !IsActive(state) {
			return nil
		}
		if !force {
			due := !now.Before(d.ExpiresAt)
			if !due && state == domain.StateWaitingAccept {
				active, err := q.HasActiveInvite(ctx, db.HasActiveInviteParams{DealID: d.ID, Now: now})
				if err != nil {
					return fmt.Errorf("check invite: %w", err)
				}
				due = !active
			}
			if !due {
				return nil
			}
		}
		next, err := NextStates(state, domain.ActionExpire, domain.RoleSystem)
		if err != nil {
			return err
		}
		n, err := q.UpdateDealState(ctx, db.UpdateDealStateParams{ID: d.ID, Version: d.Version, State: db.DealState(next[len(next)-1]), Now: now})
		if err != nil || n == 0 {
			return fmt.Errorf("update deal: %w (rows %d)", err, n)
		}
		refunded, err := s.refund(ctx, q, d, db.DealEventTypeDEALEXPIRED, db.DealStateEXPIRED, uuid.NullUUID{}, "expiry:"+d.ID.String(), now)
		if err != nil {
			return err
		}
		if err := q.RevokeInvites(ctx, db.RevokeInvitesParams{DealID: d.ID, Now: &now}); err != nil {
			return fmt.Errorf("revoke invites: %w", err)
		}
		prop, err := q.GetProperty(ctx, d.PropertyID)
		if err != nil {
			return fmt.Errorf("get property: %w", err)
		}
		body := fmt.Sprintf("ดีลห้อง %s หมดอายุแล้ว", prop.UnitNo)
		if refunded > 0 {
			body += fmt.Sprintf(" · คืนเงินที่ยังกันไว้ %s ให้ผู้เช่าอัตโนมัติ", bahtText(refunded))
		}
		if err := notify(ctx, q, d.LandlordID, db.NotificationTypeDEALEXPIRED, d.ID, "ดีลหมดอายุ", body, now); err != nil {
			return err
		}
		if d.TenantID.Valid {
			if err := notify(ctx, q, d.TenantID.UUID, db.NotificationTypeDEALREFUNDED, d.ID, "คืนเงินอัตโนมัติแล้ว", body, now); err != nil {
				return err
			}
		}
		done = true
		return nil
	})
	return done, err
}
