package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

// ---- หมดอายุอัตโนมัติ (docs/04-database.md §6.5) ----

// RunExpiryWorker ตรวจทุก tick จน ctx ถูกยกเลิก (API ปิด) — error ไม่ทำให้ worker หยุด รอบหน้าลองใหม่
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

// ExpireDue หาดีลที่ถึงกำหนด (ไม่ล็อก) แล้วจัดการทีละดีลใน transaction ของมันเอง — คืนจำนวนที่หมดอายุจริง
// ห้าม SELECT ... FOR UPDATE ทั้งชุดใน tx เดียวแล้วไปเปิด tx ใหม่ต่อดีล (tx ใหม่จะรอ lock ที่ตัวเองถือ)
func (s *DealService) ExpireDue(ctx context.Context) (int, error) {
	ids, err := s.repo.ListDueDeals(ctx, s.clock.Now())
	if err != nil {
		return 0, fmt.Errorf("list due deals: %w", err)
	}
	expired := 0
	for _, id := range ids {
		ok, err := s.expireOne(ctx, id, false)
		if err != nil {
			return expired, fmt.Errorf("expire %s: %w", id, err)
		}
		if ok {
			expired++
		}
	}
	return expired, nil
}

// ExpireNow — POST /demo/deals/{id}/expire-now: ให้ดีล active หมดอายุทันที (โชว์การคืนเงินอัตโนมัติบนเวที)
// ไม่แก้ expires_at (CHECK expires_at > viewing_at) — ข้ามการตรวจ "ถึงกำหนดหรือยัง" แทน
func (s *DealService) ExpireNow(ctx context.Context, rawID string) error {
	id, err := uuid.Parse(rawID)
	if err != nil {
		return errNotFound()
	}
	ok, err := s.expireOne(ctx, id, true)
	if err != nil {
		return err
	}
	if !ok {
		return domain.NewError(domain.CodeDealStateConflict, "ดีลนี้จบไปแล้ว หรือกำลังมีการทำรายการอยู่")
	}
	return nil
}

// expireOne: SKIP LOCKED — ผู้เช่ากำลัง confirm อยู่ = ข้าม แล้ว "ตรวจซ้ำหลังได้ lock" ว่ายัง active และยังถึงกำหนดจริง
// → expiry กับ confirm ที่ชนกันได้ผลลัพธ์เดียวเสมอ (confirm ก็ตรวจ now < expires_at หลังได้ lock เช่นกัน)
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
