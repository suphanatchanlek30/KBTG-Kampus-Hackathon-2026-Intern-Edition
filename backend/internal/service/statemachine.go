package service

import (
	"slices"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
)

type transition struct {
	from   domain.DealState
	action domain.Action
	actor  domain.Role
	to []domain.DealState
}

var transitions = []transition{
	{domain.StateWaitingAccept, domain.ActionReject, domain.RoleTenant, []domain.DealState{domain.StateRejected}},
	{domain.StateWaitingAccept, domain.ActionLock, domain.RoleTenant, []domain.DealState{domain.StateFundsLocked}},
	{domain.StateFundsLocked, domain.ActionConfirmViewing, domain.RoleTenant,
		[]domain.DealState{domain.StateViewingConfirmed, domain.StateBookingFeeReleased}},
	{domain.StateBookingFeeReleased, domain.ActionConfirmMoveIn, domain.RoleTenant,
		[]domain.DealState{domain.StateMoveInConfirmed, domain.StateReleased}},

	{domain.StateFundsLocked, domain.ActionCancel, domain.RoleLandlord, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateFundsLocked, domain.ActionCancel, domain.RoleTenant, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionCancel, domain.RoleLandlord, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionCancel, domain.RoleTenant, []domain.DealState{domain.StateCancelled, domain.StateRefunded}},

	{domain.StateWaitingAccept, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired}},
	{domain.StateFundsLocked, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired, domain.StateRefunded}},
	{domain.StateBookingFeeReleased, domain.ActionExpire, domain.RoleSystem, []domain.DealState{domain.StateExpired, domain.StateRefunded}},
}

func NextStates(from domain.DealState, action domain.Action, actor domain.Role) ([]domain.DealState, error) {
	for _, t := range transitions {
		if t.from == from && t.action == action && t.actor == actor {
			return slices.Clone(t.to), nil
		}
	}
	return nil, domain.NewError(domain.CodeDealStateConflict, "ดีลนี้ไม่อยู่ในสถานะที่ทำรายการนี้ได้")
}

func canReportIssue(state domain.DealState) bool { return state == domain.StateFundsLocked }

var actionOrder = []domain.Action{
	domain.ActionLock, domain.ActionReject, domain.ActionConfirmViewing, domain.ActionConfirmMoveIn,
	domain.ActionCancel, domain.ActionReportIssue,
}

func AllowedActions(state domain.DealState, role domain.Role) []domain.Action {
	out := []domain.Action{}
	for _, a := range actionOrder {
		if a == domain.ActionReportIssue {
			if role == domain.RoleTenant && canReportIssue(state) {
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

func NextActor(state domain.DealState) *domain.Role {
	switch state {
	case domain.StateWaitingAccept, domain.StateFundsLocked, domain.StateBookingFeeReleased:
		r := domain.RoleTenant
		return &r
	default:
		return nil
	}
}

func IsActive(state domain.DealState) bool {
	return state == domain.StateWaitingAccept || state == domain.StateFundsLocked || state == domain.StateBookingFeeReleased
}
