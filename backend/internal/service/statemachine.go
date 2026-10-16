package service

import (
	"slices"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
)

// transition คือกติกาหนึ่งแถวของ state machine (docs/04-database.md §2 "Transition ที่อนุญาต")
type transition struct {
	from   domain.DealState
	action domain.Action
	actor  domain.Role
	// to = state ที่ผ่านตามลำดับใน transaction เดียว — ตัวสุดท้ายคือค่าที่ commit ใน deals.state
	to []domain.DealState
}

var transitions = []transition{
	{domain.StateWaitingAccept, domain.ActionReject, domain.RoleTenant, []domain.DealState{domain.StateRejected}},
	{domain.StateWaitingAccept, domain.ActionLock, domain.RoleTenant, []domain.DealState{domain.StateFundsLocked}},
	{domain.StateFundsLocked, domain.ActionConfirmViewing, domain.RoleTenant,
		[]domain.DealState{domain.StateViewingConfirmed, domain.StateBookingFeeReleased}},
	{domain.StateBookingFeeReleased, domain.ActionConfirmMoveIn, domain.RoleTenant,
		[]domain.DealState{domain.StateMoveInConfirmed, domain.StateReleased}},

	// ยกเลิกต้องยินยอมทั้งสองฝ่าย — ตารางนี้คือผลเมื่อ "ฝ่ายที่สอง" กด (ฝ่ายแรกแค่บันทึกคำขอ state ไม่เปลี่ยน · Phase 8)
	{domain.StateFundsLocked, domain.ActionCancel, domain.RoleLandlord, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateFundsLocked, domain.ActionCancel, domain.RoleTenant, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionCancel, domain.RoleLandlord, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionCancel, domain.RoleTenant, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},

	{domain.StateWaitingAccept, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired}},
	{domain.StateFundsLocked, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired, domain.StateRefunded}},
}

// NextStates ตอบว่า actor ทำ action นี้ที่ state นี้ได้ไหม และผ่าน state ไหนบ้าง — pure function ไม่แตะ DB
// นอกตาราง → DEAL_STATE_CONFLICT (ผู้เรียกต้องไม่เขียนอะไรลง DB เลย)
func NextStates(from domain.DealState, action domain.Action, actor domain.Role) ([]domain.DealState, error) {
	for _, t := range transitions {
		if t.from == from && t.action == action && t.actor == actor {
			return slices.Clone(t.to), nil
		}
	}
	return nil, domain.NewError(domain.CodeDealStateConflict, "ดีลนี้ไม่อยู่ในสถานะที่ทำรายการนี้ได้")
}

// แจ้งปัญหา (D4) ไม่เปลี่ยน state จึงไม่อยู่ในตาราง transition
var reportIssueStates = []domain.DealState{domain.StateFundsLocked}

// actionOrder = ลำดับใน allowedActions (ตรงกับ frontend mock)
var actionOrder = []domain.Action{
	domain.ActionLock, domain.ActionReject, domain.ActionConfirmViewing, domain.ActionConfirmMoveIn,
	domain.ActionCancel, domain.ActionReportIssue,
}

// AllowedActions คือปุ่มที่ผู้ใช้ role นี้กดได้ตอนนี้ — frontend ใช้ตัดสินใจแสดงปุ่ม (server ยังตรวจซ้ำทุกครั้ง)
func AllowedActions(state domain.DealState, role domain.Role) []domain.Action {
	out := []domain.Action{}
	for _, a := range actionOrder {
		if a == domain.ActionReportIssue {
			if role == domain.RoleTenant && slices.Contains(reportIssueStates, state) {
				out = append(out, a)
			}
			continue
		}
		if _, err := NextStates(state, a, role); err == nil {
			out = append(out, a)
		}
	}
	return out
}

// NextActor คือใครต้องทำขั้นต่อไป (สเปก: "ทุกหน้าจอควรแสดงว่าใครทำขั้นถัดไป") · nil = ดีลจบแล้ว
// ระหว่างดีล ผู้เช่าเป็นคนขยับเสมอ (ยอมรับ → ยืนยันดูห้อง → ยืนยันเข้าอยู่)
func NextActor(state domain.DealState) *domain.Role {
	switch state {
	case domain.StateWaitingAccept, domain.StateFundsLocked, domain.StateBookingFeeReleased:
		r := domain.RoleTenant
		return &r
	default:
		return nil
	}
}

// IsActive = ดีลยังไม่จบ
func IsActive(state domain.DealState) bool {
	return state == domain.StateWaitingAccept || state == domain.StateFundsLocked || state == domain.StateBookingFeeReleased
}
