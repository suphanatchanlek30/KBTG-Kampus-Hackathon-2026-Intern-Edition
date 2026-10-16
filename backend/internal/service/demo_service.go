package service

import (
	"context"
	"errors"
	"fmt"
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

// Scenario ของ POST /demo/reset — แต่ละขั้นต่อยอดจากขั้นก่อน (docs/04-database.md §5)
type Scenario string

const (
	ScenarioFresh           Scenario = "fresh"
	ScenarioWaitingAccept   Scenario = "waiting_accept"
	ScenarioFundsLocked     Scenario = "funds_locked"
	ScenarioBookingReleased Scenario = "booking_released"
	ScenarioReleased        Scenario = "released"
)

// stage = จำนวนขั้นของดีลที่เกิดแล้ว (0 = ยังไม่มีดีล)
var scenarioStage = map[Scenario]int{
	ScenarioFresh:           0,
	ScenarioWaitingAccept:   1,
	ScenarioFundsLocked:     2,
	ScenarioBookingReleased: 3,
	ScenarioReleased:        4,
}

// ข้อมูลเดโมตั้งต้น — ตรงกับ migrations/0002_seed_demo.sql
var (
	demoLandlordID        = uuid.MustParse("00000000-0000-0000-0000-00000000a001")
	demoTenantID          = uuid.MustParse("00000000-0000-0000-0000-00000000b001")
	demoLandlordAccountID = uuid.MustParse("00000000-0000-0000-0000-0000000aa001")
	demoTenantAccountID   = uuid.MustParse("00000000-0000-0000-0000-0000000bb001")
)

const (
	demoLandlordBalance = 4_285_000 // 42,850.00
	demoTenantBalance   = 2_850_000 // 28,500.00

	// ดีลตัวอย่างค่าตรง mockup (ref/share code ใส่ตรงๆ ตาม §4 แม้ KS-8F4Q21 มีเลข 1)
	demoRefNo       = "KS-691014-0458"
	demoShareCode   = "KS-8F4Q21"
	demoTotal       = 650_000 // 6,500
	demoBookingFee  = 100_000 // 1,000
	demoMainDeposit = demoTotal - demoBookingFee

	// ชื่อบริการในข้อความแจ้งเตือน — ฝั่ง frontend อยู่ใน config/brand.ts
	brandName = "K Sure"
)

// DemoTimes คือเวลาของดีลตัวอย่าง คำนวณจาก "ตอนนี้" — ห้ามใช้วันที่ของ mockup
// ไม่งั้น expiry worker จะเปลี่ยนดีลเป็นหมดอายุทันทีหลัง reset
type DemoTimes struct {
	Created          time.Time // วันนี้ 10:24 (ถ้ายังไม่ถึง ใช้ now − 10 นาที)
	InviteSent       time.Time // + 2 นาที
	Accepted         time.Time // + 7 นาที (ผู้เช่ากันเงิน)
	InviteExpires    time.Time // Created + INVITE_TTL
	ViewingConfirmed time.Time // now − 2 นาที
	MoveInConfirmed  time.Time // now − 1 นาที
	ViewingAt        time.Time // วันอาทิตย์ถัดไป 14:00
	MoveInDate       time.Time // วันที่ 1 ของเดือนถัดไป (เลื่อนอีกเดือนถ้าก่อนวันดูห้อง) — เที่ยงคืนเวลาไทย
	ExpiresAt        time.Time // วันเข้าอยู่ + 2 วัน 23:59:59
}

// ComputeDemoTimes ทุกเหตุการณ์ที่ "เกิดแล้ว" อยู่ในอดีตเสมอ และเรียงลำดับถูก
// ส่วนวันนัดดูห้อง/เข้าอยู่อยู่ในอนาคต เพื่อให้ดีลยัง active (แม้ scenario จะบอกว่าดูห้องแล้ว)
func ComputeDemoTimes(now time.Time, loc *time.Location, inviteTTL time.Duration) DemoTimes {
	local := now.In(loc)
	y, m, d := local.Date()

	created := time.Date(y, m, d, 10, 24, 0, 0, loc)
	if latest := now.Add(-10 * time.Minute); created.After(latest) {
		created = latest.Truncate(time.Minute)
	}

	daysToSunday := (7 - int(local.Weekday())) % 7
	if daysToSunday == 0 {
		daysToSunday = 7
	}
	viewing := time.Date(y, m, d+daysToSunday, 14, 0, 0, 0, loc)

	vy, vm, vd := viewing.Date()
	moveIn := time.Date(y, m+1, 1, 0, 0, 0, 0, loc)
	if moveIn.Before(time.Date(vy, vm, vd, 0, 0, 0, 0, loc)) {
		moveIn = time.Date(y, m+2, 1, 0, 0, 0, 0, loc)
	}
	my, mm, md := moveIn.Date()

	return DemoTimes{
		Created:          created,
		InviteSent:       created.Add(2 * time.Minute),
		Accepted:         created.Add(7 * time.Minute),
		InviteExpires:    created.Add(inviteTTL),
		ViewingConfirmed: now.Add(-2 * time.Minute).Truncate(time.Second),
		MoveInConfirmed:  now.Add(-1 * time.Minute).Truncate(time.Second),
		ViewingAt:        viewing,
		MoveInDate:       moveIn,
		ExpiresAt:        time.Date(my, mm, md+2, 23, 59, 59, 0, loc),
	}
}

type DemoService struct {
	repo      *repository.Repository
	clock     clock.Clock
	loc       *time.Location
	inviteTTL time.Duration
}

func NewDemoService(repo *repository.Repository, c clock.Clock, loc *time.Location, inviteTTL time.Duration) *DemoService {
	return &DemoService{repo: repo, clock: c, loc: loc, inviteTTL: inviteTTL}
}

// Reset ล้างข้อมูลเดโม คืนยอดตั้งต้น แล้วสร้างดีลตัวอย่างตาม scenario — ทั้งหมดใน transaction เดียว
func (s *DemoService) Reset(ctx context.Context, sc Scenario) (dto.DemoResetDTO, error) {
	stage, ok := scenarioStage[sc]
	if !ok {
		return dto.DemoResetDTO{}, &domain.AppError{
			Code: domain.CodeValidationFailed, Message: "ไม่รู้จัก scenario นี้",
			Details: []domain.FieldError{{Field: "scenario", Message: "fresh | waiting_accept | funds_locked | booking_released | released"}},
		}
	}

	out := dto.DemoResetDTO{Scenario: string(sc)}
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		if err := q.TruncateDemoData(ctx); err != nil {
			return fmt.Errorf("truncate: %w", err)
		}
		landlordBal, tenantBal, tenantHeld := int64(demoLandlordBalance), int64(demoTenantBalance), int64(0)

		if stage > 0 {
			dealID, err := s.buildDeal(ctx, q, stage)
			if err != nil {
				return err
			}
			id := dealID.String()
			out.DealID = &id

			// ยอดตาม ledger ที่สร้าง (docs/04-database.md §2 ledger_event_type)
			if stage >= 2 {
				tenantHeld += demoTotal
			}
			if stage >= 3 {
				tenantBal -= demoBookingFee
				tenantHeld -= demoBookingFee
				landlordBal += demoBookingFee
			}
			if stage >= 4 {
				tenantBal -= demoMainDeposit
				tenantHeld -= demoMainDeposit
				landlordBal += demoMainDeposit
			}
		}

		if err := q.SetAccountBalance(ctx, db.SetAccountBalanceParams{ID: demoLandlordAccountID, BalanceSatang: landlordBal}); err != nil {
			return fmt.Errorf("reset landlord balance: %w", err)
		}
		if err := q.SetAccountBalance(ctx, db.SetAccountBalanceParams{
			ID: demoTenantAccountID, BalanceSatang: tenantBal, HeldSatang: tenantHeld,
		}); err != nil {
			return fmt.Errorf("reset tenant balance: %w", err)
		}
		return nil
	})
	if err != nil {
		return dto.DemoResetDTO{}, err
	}
	return out, nil
}

// buildDeal เขียนดีลตัวอย่างพร้อมคำเชิญ ไทม์ไลน์ ledger และแจ้งเตือน ให้ตรงกับที่ action จริง (Phase 6) จะเขียน
func (s *DemoService) buildDeal(ctx context.Context, q *db.Queries, stage int) (uuid.UUID, error) {
	props, err := q.ListPropertiesByLandlord(ctx, demoLandlordID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("list properties: %w", err)
	}
	if len(props) == 0 {
		return uuid.Nil, errors.New("demo landlord has no property — run migrations (0002_seed_demo)")
	}
	prop := props[0]
	t := ComputeDemoTimes(s.clock.Now(), s.loc, s.inviteTTL)

	states := []db.DealState{"", db.DealStateWAITINGACCEPT, db.DealStateFUNDSLOCKED, db.DealStateBOOKINGFEERELEASED, db.DealStateRELEASED}
	deal := db.InsertDealParams{
		RefNo: demoRefNo, ShareCode: demoShareCode,
		LandlordID: demoLandlordID, LandlordAccountID: demoLandlordAccountID, PropertyID: prop.ID,
		TotalSatang: demoTotal, BookingFeeSatang: demoBookingFee, MainDepositSatang: demoMainDeposit,
		ViewingAt: t.ViewingAt, MoveInDate: pgtype.Date{Time: t.MoveInDate, Valid: true}, ExpiresAt: t.ExpiresAt,
		State: states[stage], Version: int32(stage), CreatedAt: t.Created,
	}
	if stage >= 2 {
		deal.TenantID = uuid.NullUUID{UUID: demoTenantID, Valid: true}
		deal.TenantAccountID = uuid.NullUUID{UUID: demoTenantAccountID, Valid: true}
	}
	dealID, err := q.InsertDeal(ctx, deal)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert deal: %w", err)
	}

	// คำเชิญ QR (token จริงทิ้งไป — เดโมเปิดดีลด้วย share code)
	_, hash := token.NewInvite()
	if err := q.InsertDealInvite(ctx, db.InsertDealInviteParams{
		DealID: dealID, TokenHash: hash, Channel: db.InviteChannelQR, ExpiresAt: t.InviteExpires, CreatedAt: t.Created,
	}); err != nil {
		return uuid.Nil, fmt.Errorf("insert invite: %w", err)
	}

	w := seedWriter{ctx: ctx, q: q, dealID: dealID}
	landlord := uuid.NullUUID{UUID: demoLandlordID, Valid: true}
	tenant := uuid.NullUUID{UUID: demoTenantID, Valid: true}
	tenantAcc := uuid.NullUUID{UUID: demoTenantAccountID, Valid: true}
	landlordAcc := uuid.NullUUID{UUID: demoLandlordAccountID, Valid: true}

	// 1) สร้างคำขอ + ส่งเข้าแอปผู้เช่า
	w.event(db.DealEventTypeDEALCREATED, landlord, "", db.DealStateWAITINGACCEPT, 0, t.Created)
	w.event(db.DealEventTypeINVITESENT, landlord, db.DealStateWAITINGACCEPT, db.DealStateWAITINGACCEPT, 0, t.InviteSent)
	// อ่านแล้วเมื่อผู้เช่ากันเงิน (stage ≥ 2)
	w.notify(demoTenantID, db.NotificationTypeDEALINVITE, "คำขอ "+brandName+" ใหม่", "จากคุณสมชาย ใ.", t.InviteSent, stage >= 2, t.Accepted)

	// 2) ผู้เช่ายอมรับ + กันเงิน
	if stage >= 2 {
		w.event(db.DealEventTypeDEALACCEPTED, tenant, db.DealStateWAITINGACCEPT, db.DealStateWAITINGACCEPT, 0, t.Accepted)
		w.event(db.DealEventTypeFUNDSLOCKED, tenant, db.DealStateWAITINGACCEPT, db.DealStateFUNDSLOCKED, demoTotal, t.Accepted)
		w.ledger(db.LedgerEventTypeHOLD, demoTotal, tenantAcc, uuid.NullUUID{}, tenant, t.Accepted)
		w.notify(demoLandlordID, db.NotificationTypeFUNDSLOCKED, "เงินถูกกันไว้แล้ว",
			"ณัฐธิดา ศ. กันเงิน 6,500 สำหรับห้อง "+prop.UnitNo, t.Accepted, stage >= 3, t.ViewingConfirmed)
	}

	// 3) ยืนยันดูห้อง → ปล่อยค่าจอง
	if stage >= 3 {
		w.event(db.DealEventTypeVIEWINGCONFIRMED, tenant, db.DealStateFUNDSLOCKED, db.DealStateVIEWINGCONFIRMED, 0, t.ViewingConfirmed)
		w.event(db.DealEventTypeBOOKINGFEERELEASED, tenant, db.DealStateVIEWINGCONFIRMED, db.DealStateBOOKINGFEERELEASED, demoBookingFee, t.ViewingConfirmed)
		w.ledger(db.LedgerEventTypeRELEASEBOOKINGFEE, demoBookingFee, tenantAcc, landlordAcc, tenant, t.ViewingConfirmed)
		w.notify(demoLandlordID, db.NotificationTypeBOOKINGFEERELEASED, "ได้รับค่าจอง 1,000",
			"ณัฐธิดา ศ. ยืนยันดูห้อง "+prop.UnitNo+" แล้ว", t.ViewingConfirmed, stage >= 4, t.MoveInConfirmed)
	}

	// 4) ยืนยันเข้าอยู่ → ปล่อยมัดจำหลัก
	if stage >= 4 {
		w.event(db.DealEventTypeMOVEINCONFIRMED, tenant, db.DealStateBOOKINGFEERELEASED, db.DealStateMOVEINCONFIRMED, 0, t.MoveInConfirmed)
		w.event(db.DealEventTypeMAINDEPOSITRELEASED, tenant, db.DealStateMOVEINCONFIRMED, db.DealStateRELEASED, demoMainDeposit, t.MoveInConfirmed)
		w.ledger(db.LedgerEventTypeRELEASEMAINDEPOSIT, demoMainDeposit, tenantAcc, landlordAcc, tenant, t.MoveInConfirmed)
		w.notify(demoLandlordID, db.NotificationTypeMAINDEPOSITRELEASED, "ได้รับเงินครบแล้ว 6,500",
			"ณัฐธิดา ศ. ยืนยันเข้าอยู่ห้อง "+prop.UnitNo+" แล้ว", t.MoveInConfirmed, false, time.Time{})
	}

	if w.err != nil {
		return uuid.Nil, w.err
	}
	return dealID, nil
}

// seedWriter เก็บ error แรกไว้ ให้โค้ด scenario อ่านเป็นลำดับเหตุการณ์ได้โดยไม่ต้องเช็ก err ทุกบรรทัด
type seedWriter struct {
	ctx    context.Context
	q      *db.Queries
	dealID uuid.UUID
	err    error
}

func (w *seedWriter) event(typ db.DealEventType, actor uuid.NullUUID, from, to db.DealState, amount int64, at time.Time) {
	if w.err != nil {
		return
	}
	p := db.InsertDealEventParams{
		DealID: w.dealID, EventType: typ, ActorID: actor,
		FromState:    db.NullDealState{DealState: from, Valid: from != ""},
		ToState:      db.NullDealState{DealState: to, Valid: to != ""},
		AmountSatang: pgtype.Int8{Int64: amount, Valid: amount > 0}, CreatedAt: at,
	}
	if err := w.q.InsertDealEvent(w.ctx, p); err != nil {
		w.err = fmt.Errorf("insert event %s: %w", typ, err)
	}
}

func (w *seedWriter) ledger(typ db.LedgerEventType, amount int64, from, to, actor uuid.NullUUID, at time.Time) {
	if w.err != nil {
		return
	}
	if err := w.q.InsertLedgerEvent(w.ctx, db.InsertLedgerEventParams{
		DealID: w.dealID, EventType: typ, AmountSatang: amount, FromAccountID: from, ToAccountID: to,
		ActorID: actor, IdempotencyKey: "demo-seed:" + string(typ), CreatedAt: at,
	}); err != nil {
		w.err = fmt.Errorf("insert ledger %s: %w", typ, err)
	}
}

func (w *seedWriter) notify(user uuid.UUID, typ db.NotificationType, title, body string, at time.Time, read bool, readAt time.Time) {
	if w.err != nil {
		return
	}
	var r *time.Time
	if read {
		r = &readAt
	}
	if err := w.q.InsertNotification(w.ctx, db.InsertNotificationParams{
		UserID: user, Type: typ, DealID: uuid.NullUUID{UUID: w.dealID, Valid: true},
		Title: title, Body: body, ReadAt: r, CreatedAt: at,
	}); err != nil {
		w.err = fmt.Errorf("insert notification %s: %w", typ, err)
	}
}
