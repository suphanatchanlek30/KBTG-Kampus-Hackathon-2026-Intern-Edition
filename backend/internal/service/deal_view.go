package service

import (
	"context"
	"fmt"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/dto"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

// viewOpts ปรับสิ่งที่ DealDTO เปิดเผย
type viewOpts struct {
	// qrURL ส่งเฉพาะตอนสร้าง/ออก QR ใหม่ (token จริงไม่ได้เก็บใน DB)
	qrURL string
	// invitePreview = ผู้เช่าดูผ่านคำเชิญ (T2) ก่อนเป็นคู่ดีล — ไม่มีข้อมูลผู้เช่า
	invitePreview bool
}

// buildDealDTO ประกอบ DealDTO จากดีล + ห้อง + คู่ดีล + ไทม์ไลน์ + ledger (docs/05-api.md §3)
// ใช้ q เดียวกับ action เพื่ออ่านค่าหลังเขียนใน transaction เดียวกัน
func (s *DealService) buildDealDTO(ctx context.Context, q *db.Queries, d db.Deal, role domain.Role, opt viewOpts) (dto.DealDTO, error) {
	prop, err := q.GetProperty(ctx, d.PropertyID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("get property: %w", err)
	}
	landlord, err := q.GetUserByID(ctx, d.LandlordID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("get landlord: %w", err)
	}
	landlordAcc, err := q.GetAccount(ctx, d.LandlordAccountID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("get landlord account: %w", err)
	}
	events, err := q.ListDealEvents(ctx, d.ID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("list events: %w", err)
	}
	ledger, err := q.ListLedgerEvents(ctx, d.ID)
	if err != nil {
		return dto.DealDTO{}, fmt.Errorf("list ledger: %w", err)
	}

	verified := true // ชื่อผู้ให้เช่าตรงกับชื่อบัญชีธนาคาร (เดโม: บัญชีของระบบเอง)
	out := dto.DealDTO{
		ID: d.ID.String(), RefNo: d.RefNo, ShareCode: d.ShareCode, State: string(d.State), Version: d.Version,
		DealType: d.DealType,
		Property: dto.DealPropertyDTO{
			ID: prop.ID.String(), PropertyType: prop.PropertyType, ProjectName: prop.ProjectName,
			UnitNo: prop.UnitNo, DetailLabel: prop.DetailLabel, NearbyLabel: prop.NearbyLabel.String,
		},
		Landlord: dto.PartyDTO{
			DisplayName: landlord.DisplayName, ShortName: landlord.ShortName, BankName: landlordAcc.BankName,
			AccountNoMasked: landlordAcc.AccountNoMasked, NameVerified: &verified,
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

	if d.TenantID.Valid && !opt.invitePreview {
		tenant, err := q.GetUserByID(ctx, d.TenantID.UUID)
		if err != nil {
			return dto.DealDTO{}, fmt.Errorf("get tenant: %w", err)
		}
		party := dto.PartyDTO{DisplayName: tenant.DisplayName, ShortName: tenant.ShortName}
		if d.TenantAccountID.Valid {
			acc, err := q.GetAccount(ctx, d.TenantAccountID.UUID)
			if err != nil {
				return dto.DealDTO{}, fmt.Errorf("get tenant account: %w", err)
			}
			party.BankName, party.AccountNoMasked = acc.BankName, acc.AccountNoMasked
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

	invite, err := q.GetLatestInvite(ctx, d.ID)
	switch {
	case err == nil:
		out.Invite = &dto.InviteDTO{ExpiresAt: iso(invite.ExpiresAt, s.loc), QrURL: opt.qrURL, SentAt: sentAt}
	case !repository.IsNotFound(err):
		return dto.DealDTO{}, fmt.Errorf("get invite: %w", err)
	}

	state := domain.DealState(d.State)
	iRequested, theyRequested := d.LandlordCancelRequestedAt != nil, d.TenantCancelRequestedAt != nil
	if role == domain.RoleTenant {
		iRequested, theyRequested = theyRequested, iRequested
	}
	for _, a := range AllowedActions(state, role) {
		// ขอยกเลิกไปแล้ว → รออีกฝ่าย · แจ้งปัญหาไปแล้ว → ไม่ต้องแจ้งซ้ำ
		if (a == domain.ActionCancel && iRequested) || (a == domain.ActionReportIssue && d.HasOpenIssue) {
			continue
		}
		out.AllowedActions = append(out.AllowedActions, string(a))
	}
	next := NextActor(state)
	if next != nil && iRequested != theyRequested {
		// มีคำขอยกเลิกค้างอยู่ — คนที่ต้องทำต่อคือฝ่ายที่ยังไม่ได้ยินยอม
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

// fillMoney คำนวณยอดและสถานะงวดจาก ledger (ไม่ใช่จาก state) — ledger คือความจริงของเงิน
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
