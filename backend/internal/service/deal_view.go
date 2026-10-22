package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/dto"
	"github.com/suphanatchanlek30/psure/backend/internal/repository/db"
)

type viewOpts struct {
	qrURL         string
	invitePreview bool
}

func (s *DealService) buildDealDTO(ctx context.Context, q *db.Queries, d db.Deal, role domain.Role, opt viewOpts) (dto.DealDTO, error) {
	tenantID, tenantAccountID := d.TenantID, d.TenantAccountID
	if opt.invitePreview || !tenantID.Valid {
		tenantID, tenantAccountID = uuid.NullUUID{}, uuid.NullUUID{}
	}
	pr, err := q.GetDealParties(ctx, db.GetDealPartiesParams{
		DealID: d.ID, PropertyID: d.PropertyID, LandlordID: d.LandlordID, LandlordAccountID: d.LandlordAccountID,
		TenantID: tenantID, TenantAccountID: tenantAccountID,
	})
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("get deal parties: %w", err)
	}
	if tenantID.Valid && !pr.TenantDisplayName.Valid {
		return dto.DealDTO{}, fmt.Errorf("get tenant: %w", pgx.ErrNoRows)
	}
	if tenantAccountID.Valid && !pr.TenantBankName.Valid {
		return dto.DealDTO{}, fmt.Errorf("get tenant account: %w", pgx.ErrNoRows)
	}
	history, err := q.ListDealHistory(ctx, d.ID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("list history: %w", err)
	}
	var events []db.DealEvent
	var ledger []db.LedgerEvent
	for _, h := range history {
		if h.Kind == "E" {
			events = append(events, db.DealEvent{EventType: db.DealEventType(h.EventType), AmountSatang: h.AmountSatang, CreatedAt: h.CreatedAt})
		} else {
			ledger = append(ledger, db.LedgerEvent{EventType: db.LedgerEventType(h.EventType), AmountSatang: h.AmountSatang.Int64, CreatedAt: h.CreatedAt})
		}
	}
	prop := pr.Property

	verified := true // Demo accounts are treated as name-verified.
	out := dto.DealDTO{
		ID: d.ID.String(), RefNo: d.RefNo, ShareCode: d.ShareCode, State: string(d.State), Version: d.Version,
		DealType: d.DealType,
		Property: dto.DealPropertyDTO{
			ID: prop.ID.String(), PropertyType: prop.PropertyType, ProjectName: prop.ProjectName,
			UnitNo: prop.UnitNo, DetailLabel: prop.DetailLabel, NearbyLabel: prop.NearbyLabel.String,
		},
		Landlord: dto.PartyDTO{
			DisplayName: pr.LandlordDisplayName, ShortName: pr.LandlordShortName, BankName: pr.LandlordBankName,
			AccountNoMasked: pr.LandlordAccountNoMasked, NameVerified: &verified,
		},
		ViewingAt:  iso(d.ViewingAt, s.loc),
		MoveInDate: d.MoveInDate.Time.Format("2006-01-02"),
		ExpiresAt:  iso(d.ExpiresAt, s.loc),
		Cancel: dto.CancelDTO{
			LandlordRequestedAt: isoPtr(d.LandlordCancelRequestedAt, s.loc),
			TenantRequestedAt:   isoPtr(d.TenantCancelRequestedAt, s.loc),
		},
		HasOpenIssue:   d.HasOpenIssue,
		MyRole:         string(role),
		AllowedActions: []string{},
		Timeline:       make([]dto.TimelineItemDTO, 0, len(events)),
		CreatedAt:      iso(d.CreatedAt, s.loc),
	}

	if tenantID.Valid {
		party := dto.PartyDTO{DisplayName: pr.TenantDisplayName.String, ShortName: pr.TenantShortName.String}
		if tenantAccountID.Valid {
			party.BankName, party.AccountNoMasked = pr.TenantBankName.String, pr.TenantAccountNoMasked.String
		}
		out.Tenant = &party
	}

	s.fillMoney(&out, d, ledger)

	var sentAt *string
	for _, e := range events {
		item := dto.TimelineItemDTO{Type: string(e.EventType), At: iso(e.CreatedAt, s.loc)}
		if e.AmountSatang.Valid {
			v := e.AmountSatang.Int64
			item.AmountSatang = &v
		}
		out.Timeline = append(out.Timeline, item)
		if e.EventType == db.DealEventTypeINVITESENT {
			sentAt = &item.At
		}
	}

	if len(pr.LatestInviteExpiresAt) > 0 {
		out.Invite = &dto.InviteDTO{ExpiresAt: iso(pr.LatestInviteExpiresAt[0], s.loc), QrURL: opt.qrURL, SentAt: sentAt}
	}

	state := domain.DealState(d.State)
	iRequested, theyRequested := d.LandlordCancelRequestedAt != nil, d.TenantCancelRequestedAt != nil
	if role == domain.RoleTenant {
		iRequested, theyRequested = theyRequested, iRequested
	}
	for _, a := range AllowedActions(state, role) {
		if (a == domain.ActionCancel && iRequested) || (a == domain.ActionReportIssue && d.HasOpenIssue) {
			continue
		}
		out.AllowedActions = append(out.AllowedActions, string(a))
	}
	next := NextActor(state)
	if next != nil && iRequested != theyRequested {
		other := domain.RoleLandlord
		if (role == domain.RoleLandlord) == iRequested {
			other = domain.RoleTenant
		}
		next = &other
	}
	if next != nil {
		v := string(*next)
		out.NextActor = &v
	}
	return out, nil
}

func (s *DealService) fillMoney(out *dto.DealDTO, d db.Deal, ledger []db.LedgerEvent) {
	var held, released, refunded int64
	var bookingAt, mainAt *string
	for _, l := range ledger {
		at := iso(l.CreatedAt, s.loc)
		switch l.EventType {
		case db.LedgerEventTypeHOLD:
			held += l.AmountSatang
		case db.LedgerEventTypeRELEASEBOOKINGFEE:
			released += l.AmountSatang
			bookingAt = &at
		case db.LedgerEventTypeRELEASEMAINDEPOSIT:
			released += l.AmountSatang
			mainAt = &at
		case db.LedgerEventTypeREFUND:
			refunded += l.AmountSatang
		}
	}
	out.Amounts = dto.DealAmountsDTO{
		TotalSatang: d.TotalSatang, BookingFeeSatang: d.BookingFeeSatang, MainDepositSatang: d.MainDepositSatang,
		FeeSatang: d.FeeSatang, ReleasedSatang: released, HeldSatang: held - released - refunded, RefundedSatang: refunded,
	}

	status := func(releasedAt *string) string {
		switch {
		case releasedAt != nil:
			return "RELEASED"
		case refunded > 0:
			return "REFUNDED"
		case held > 0:
			return "HELD"
		default:
			return "PENDING"
		}
	}
	out.Tranches = []dto.TrancheDTO{
		{Key: "BOOKING_FEE", AmountSatang: d.BookingFeeSatang, Status: status(bookingAt), ReleasedAt: bookingAt},
		{Key: "MAIN_DEPOSIT", AmountSatang: d.MainDepositSatang, Status: status(mainAt), ReleasedAt: mainAt},
	}
}
