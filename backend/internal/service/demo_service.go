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

type Scenario string

const (
	ScenarioFresh           Scenario = "fresh"
	ScenarioWaitingAccept   Scenario = "waiting_accept"
	ScenarioFundsLocked     Scenario = "funds_locked"
	ScenarioBookingReleased Scenario = "booking_released"
	ScenarioReleased        Scenario = "released"
)

var scenarioStage = map[Scenario]int{
	ScenarioFresh:           0,
	ScenarioWaitingAccept:   1,
	ScenarioFundsLocked:     2,
	ScenarioBookingReleased: 3,
	ScenarioReleased:        4,
}

var (
	demoLandlordID        = uuid.MustParse("00000000-0000-0000-0000-00000000a001")
	demoTenantID          = uuid.MustParse("00000000-0000-0000-0000-00000000b001")
	demoLandlordAccountID = uuid.MustParse("00000000-0000-0000-0000-0000000aa001")
	demoTenantAccountID   = uuid.MustParse("00000000-0000-0000-0000-0000000bb001")
)

const (
	demoLandlordBalance = 4_285_000 // 42,850.00
	demoTenantBalance   = 2_850_000 // 28,500.00

	demoRefNo       = "KS-691014-0458"
	demoShareCode   = "KS-8F4Q21"
	demoTotal       = 650_000 // 6,500
	demoBookingFee  = 100_000 // 1,000
	demoMainDeposit = demoTotal - demoBookingFee

	brandName = "K Sure"
)

type DemoTimes struct {
	Created          time.Time // 10:24 today, or ten minutes before now.
	InviteSent       time.Time // Two minutes after creation.
	Accepted         time.Time // Seven minutes after creation.
	InviteExpires    time.Time // Created + INVITE_TTL
	ViewingConfirmed time.Time // Two minutes before now.
	MoveInConfirmed  time.Time // One minute before now.
	ViewingAt        time.Time // Next Sunday at 14:00.
	MoveInDate       time.Time // First day of the next valid month at Bangkok midnight.
	ExpiresAt        time.Time // Two days after move-in at 23:59:59.
}

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

func (s *DemoService) Reset(ctx context.Context, actor domain.Actor, sc Scenario) (dto.DemoResetDTO, error) {
	stage, err := scenarioStageOf(sc)
	if err != nil {
		return dto.DemoResetDTO{}, err
	}
	out := dto.DemoResetDTO{Scenario: string(sc)}
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		cast, err := s.castFor(ctx, q, actor.SandboxID)
		if err != nil {
			return err
		}
		if err := purgeScope(ctx, q, cast.sandbox); err != nil {
			return err
		}
		out.DealID, err = s.seedScenario(ctx, q, cast, stage)
		return err
	})
	if err != nil {
		return dto.DemoResetDTO{}, err
	}
	return out, nil
}

func scenarioStageOf(sc Scenario) (int, error) {
	stage, ok := scenarioStage[sc]
	if !ok {
		return 0, &domain.AppError{
			Code: domain.CodeValidationFailed, Message: "ไม่รู้จัก scenario นี้",
			Details: []domain.FieldError{{Field: "scenario", Message: "fresh | waiting_accept | funds_locked | booking_released | released"}},
		}
	}
	return stage, nil
}

// demoCast is the landlord and tenant one demo scope plays with: the shared accounts
// (sandbox invalid) or one visitor's sandbox.
type demoCast struct {
	sandbox                            uuid.NullUUID
	landlordID, tenantID               uuid.UUID
	landlordAccountID, tenantAccountID uuid.UUID
}

var sharedCast = demoCast{
	landlordID: demoLandlordID, tenantID: demoTenantID,
	landlordAccountID: demoLandlordAccountID, tenantAccountID: demoTenantAccountID,
}

func (s *DemoService) castFor(ctx context.Context, q *db.Queries, sandbox uuid.NullUUID) (demoCast, error) {
	if !sandbox.Valid {
		return sharedCast, nil
	}
	cast := demoCast{sandbox: sandbox}
	for _, p := range []struct {
		username      string
		user, account *uuid.UUID
	}{{"landlord", &cast.landlordID, &cast.landlordAccountID}, {"tenant", &cast.tenantID, &cast.tenantAccountID}} {
		u, err := q.GetUserByUsername(ctx, db.GetUserByUsernameParams{SandboxID: sandbox, Username: p.username})
		if err != nil {
			return demoCast{}, fmt.Errorf("get sandbox %s: %w", p.username, err)
		}
		acc, err := q.GetPrimaryAccount(ctx, u.ID)
		if err != nil {
			return demoCast{}, fmt.Errorf("get sandbox %s account: %w", p.username, err)
		}
		*p.user, *p.account = u.ID, acc.ID
	}
	return cast, nil
}

// purgeScope deletes all deal activity in one scope: the shared accounts or one sandbox.
func purgeScope(ctx context.Context, q *db.Queries, sandbox uuid.NullUUID) error {
	steps := []struct {
		name string
		run  func(context.Context, uuid.NullUUID) error
	}{
		{"ledger", q.PurgeScopeLedger}, {"deal events", q.PurgeScopeDealEvents}, {"invites", q.PurgeScopeInvites},
		{"notifications", q.PurgeScopeNotifications}, {"transfers", q.PurgeScopeTransfers},
		{"idempotency keys", q.PurgeScopeIdempotency}, {"deals", q.PurgeScopeDeals},
	}
	if err := q.EnablePurge(ctx); err != nil {
		return fmt.Errorf("enable purge: %w", err)
	}
	for _, st := range steps {
		if err := st.run(ctx, sandbox); err != nil {
			return fmt.Errorf("purge %s: %w", st.name, err)
		}
	}
	return nil
}

// seedScenario resets the cast's balances and builds the scenario's deal, if any.
func (s *DemoService) seedScenario(ctx context.Context, q *db.Queries, cast demoCast, stage int) (*string, error) {
	var out *string
	landlordBal, tenantBal, tenantHeld := int64(demoLandlordBalance), int64(demoTenantBalance), int64(0)
	if stage > 0 {
		dealID, err := s.buildDeal(ctx, q, cast, stage)
		if err != nil {
			return nil, err
		}
		id := dealID.String()
		out = &id

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
	if err := q.SetAccountBalance(ctx, db.SetAccountBalanceParams{ID: cast.landlordAccountID, BalanceSatang: landlordBal}); err != nil {
		return nil, fmt.Errorf("reset landlord balance: %w", err)
	}
	if err := q.SetAccountBalance(ctx, db.SetAccountBalanceParams{
		ID: cast.tenantAccountID, BalanceSatang: tenantBal, HeldSatang: tenantHeld,
	}); err != nil {
		return nil, fmt.Errorf("reset tenant balance: %w", err)
	}
	return out, nil
}

func (s *DemoService) buildDeal(ctx context.Context, q *db.Queries, cast demoCast, stage int) (uuid.UUID, error) {
	props, err := q.ListPropertiesByLandlord(ctx, cast.landlordID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("list properties: %w", err)
	}
	if len(props) == 0 {
		return uuid.Nil, errors.New("demo landlord has no property — run migrations (0002_seed_demo)")
	}
	prop := props[0]
	t := ComputeDemoTimes(s.clock.Now(), s.loc, s.inviteTTL)

	states := []db.DealState{"", db.DealStateWAITINGACCEPT, db.DealStateFUNDSLOCKED, db.DealStateBOOKINGFEERELEASED, db.DealStateRELEASED}
	refNo, shareCode := demoRefNo, demoShareCode
	if cast.sandbox.Valid {
		if refNo, shareCode, err = s.newSandboxCodes(ctx, q); err != nil {
			return uuid.Nil, err
		}
	}
	deal := db.InsertDealParams{
		RefNo: refNo, ShareCode: shareCode, SandboxID: cast.sandbox,
		LandlordID: cast.landlordID, LandlordAccountID: cast.landlordAccountID, PropertyID: prop.ID,
		TotalSatang: demoTotal, BookingFeeSatang: demoBookingFee, MainDepositSatang: demoMainDeposit,
		ViewingAt: t.ViewingAt, MoveInDate: pgtype.Date{Time: t.MoveInDate, Valid: true}, ExpiresAt: t.ExpiresAt,
		State: states[stage], Version: int32(stage), CreatedAt: t.Created,
	}
	if stage >= 2 {
		deal.TenantID = uuid.NullUUID{UUID: cast.tenantID, Valid: true}
		deal.TenantAccountID = uuid.NullUUID{UUID: cast.tenantAccountID, Valid: true}
	}
	dealID, err := q.InsertDeal(ctx, deal)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert deal: %w", err)
	}

	_, hash := token.NewInvite()
	if err := q.InsertDealInvite(ctx, db.InsertDealInviteParams{
		DealID: dealID, TokenHash: hash, Channel: db.InviteChannelQR, ExpiresAt: t.InviteExpires, CreatedAt: t.Created,
	}); err != nil {
		return uuid.Nil, fmt.Errorf("insert invite: %w", err)
	}

	landlordUser, err := q.GetUserByID(ctx, cast.landlordID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get demo landlord: %w", err)
	}
	tenantUser, err := q.GetUserByID(ctx, cast.tenantID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get demo tenant: %w", err)
	}
	ll, tn, unit := landlordUser.ShortName, tenantUser.ShortName, prop.UnitNo

	w := seedWriter{ctx: ctx, q: q, dealID: dealID}
	landlord := uuid.NullUUID{UUID: cast.landlordID, Valid: true}
	tenant := uuid.NullUUID{UUID: cast.tenantID, Valid: true}
	tenantAcc := uuid.NullUUID{UUID: cast.tenantAccountID, Valid: true}
	landlordAcc := uuid.NullUUID{UUID: cast.landlordAccountID, Valid: true}

	w.event(db.DealEventTypeDEALCREATED, landlord, "", db.DealStateWAITINGACCEPT, 0, t.Created)
	w.event(db.DealEventTypeINVITESENT, landlord, db.DealStateWAITINGACCEPT, db.DealStateWAITINGACCEPT, 0, t.InviteSent)
	w.notify(cast.tenantID, db.NotificationTypeDEALINVITE, inviteMsg(ll), t.InviteSent, stage >= 2, t.Accepted)

	if stage >= 2 {
		w.event(db.DealEventTypeDEALACCEPTED, tenant, db.DealStateWAITINGACCEPT, db.DealStateWAITINGACCEPT, 0, t.Accepted)
		w.event(db.DealEventTypeFUNDSLOCKED, tenant, db.DealStateWAITINGACCEPT, db.DealStateFUNDSLOCKED, demoTotal, t.Accepted)
		w.ledger(db.LedgerEventTypeHOLD, demoTotal, tenantAcc, uuid.NullUUID{}, tenant, t.Accepted)
		w.notify(cast.landlordID, db.NotificationTypeFUNDSLOCKED,
			lockedLandlordMsg(deal.TotalSatang, tn, unit), t.Accepted, stage >= 3, t.ViewingConfirmed)
		w.notify(cast.tenantID, db.NotificationTypeFUNDSLOCKED,
			lockedTenantMsg(deal.TotalSatang, unit), t.Accepted, stage >= 3, t.ViewingConfirmed)
	}

	if stage >= 3 {
		w.event(db.DealEventTypeVIEWINGCONFIRMED, tenant, db.DealStateFUNDSLOCKED, db.DealStateVIEWINGCONFIRMED, 0, t.ViewingConfirmed)
		w.event(db.DealEventTypeBOOKINGFEERELEASED, tenant, db.DealStateVIEWINGCONFIRMED, db.DealStateBOOKINGFEERELEASED, demoBookingFee, t.ViewingConfirmed)
		w.ledger(db.LedgerEventTypeRELEASEBOOKINGFEE, demoBookingFee, tenantAcc, landlordAcc, tenant, t.ViewingConfirmed)
		w.notify(cast.landlordID, db.NotificationTypeBOOKINGFEERELEASED,
			bookingLandlordMsg(deal.BookingFeeSatang, tn, unit), t.ViewingConfirmed, stage >= 4, t.MoveInConfirmed)
		w.notify(cast.tenantID, db.NotificationTypeBOOKINGFEERELEASED,
			bookingTenantMsg(deal.BookingFeeSatang, ll, unit), t.ViewingConfirmed, stage >= 4, t.MoveInConfirmed)
	}

	if stage >= 4 {
		w.event(db.DealEventTypeMOVEINCONFIRMED, tenant, db.DealStateBOOKINGFEERELEASED, db.DealStateMOVEINCONFIRMED, 0, t.MoveInConfirmed)
		w.event(db.DealEventTypeMAINDEPOSITRELEASED, tenant, db.DealStateMOVEINCONFIRMED, db.DealStateRELEASED, demoMainDeposit, t.MoveInConfirmed)
		w.ledger(db.LedgerEventTypeRELEASEMAINDEPOSIT, demoMainDeposit, tenantAcc, landlordAcc, tenant, t.MoveInConfirmed)
		w.notify(cast.landlordID, db.NotificationTypeMAINDEPOSITRELEASED,
			releasedLandlordMsg(deal.TotalSatang, tn, unit), t.MoveInConfirmed, false, time.Time{})
		w.notify(cast.tenantID, db.NotificationTypeMAINDEPOSITRELEASED,
			releasedTenantMsg(deal.TotalSatang, deal.MainDepositSatang, ll, unit), t.MoveInConfirmed, false, time.Time{})
	}

	if w.err != nil {
		return uuid.Nil, w.err
	}
	return dealID, nil
}

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

func (w *seedWriter) notify(user uuid.UUID, typ db.NotificationType, m message, at time.Time, read bool, readAt time.Time) {
	if w.err != nil {
		return
	}
	var r *time.Time
	if read {
		r = &readAt
	}
	if err := w.q.InsertNotification(w.ctx, db.InsertNotificationParams{
		UserID: user, Type: typ, DealID: uuid.NullUUID{UUID: w.dealID, Valid: true},
		Title: m.title, Body: m.body, ReadAt: r, CreatedAt: at,
	}); err != nil {
		w.err = fmt.Errorf("insert notification %s: %w", typ, err)
	}
}
