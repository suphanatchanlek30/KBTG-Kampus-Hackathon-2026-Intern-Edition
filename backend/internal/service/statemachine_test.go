package service

import (
	"fmt"
	"slices"
	"testing"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
)

var (
	allStates = []domain.DealState{
		domain.StateWaitingAccept, domain.StateRejected, domain.StateFundsLocked, domain.StateViewingConfirmed,
		domain.StateBookingFeeReleased, domain.StateMoveInConfirmed, domain.StateReleased, domain.StateExpired,
		domain.StateCancelled, domain.StateRefunded,
	}
	allActions = []domain.Action{
		domain.ActionReject, domain.ActionLock, domain.ActionConfirmViewing, domain.ActionConfirmMoveIn,
		domain.ActionCancel, domain.ActionExpire,
	}
	allActors = []domain.Role{domain.RoleLandlord, domain.RoleTenant, domain.RoleSystem}
)

// ตารางที่คาดหวัง เขียนแยกจากโค้ดตามเอกสาร docs/04-database.md §2 — ทุกคู่ที่ไม่อยู่ในนี้ต้องถูกปฏิเสธ
var allowed = map[string][]domain.DealState{
	"WAITING_ACCEPT/REJECT/TENANT":                {domain.StateRejected},
	"WAITING_ACCEPT/LOCK/TENANT":                  {domain.StateFundsLocked},
	"FUNDS_LOCKED/CONFIRM_VIEWING/TENANT":         {domain.StateViewingConfirmed, domain.StateBookingFeeReleased},
	"BOOKING_FEE_RELEASED/CONFIRM_MOVE_IN/TENANT": {domain.StateMoveInConfirmed, domain.StateReleased},
	"FUNDS_LOCKED/CANCEL/LANDLORD":                {domain.StateCancelled, domain.StateRefunded},
	"FUNDS_LOCKED/CANCEL/TENANT":                  {domain.StateCancelled, domain.StateRefunded},
	"BOOKING_FEE_RELEASED/CANCEL/LANDLORD":        {domain.StateCancelled, domain.StateRefunded},
	"BOOKING_FEE_RELEASED/CANCEL/TENANT":          {domain.StateCancelled, domain.StateRefunded},
	"WAITING_ACCEPT/EXPIRE/SYSTEM":                {domain.StateExpired},
	"FUNDS_LOCKED/EXPIRE/SYSTEM":                  {domain.StateExpired, domain.StateRefunded},
	"BOOKING_FEE_RELEASED/EXPIRE/SYSTEM":          {domain.StateExpired, domain.StateRefunded},
}

// ทุกคู่ state × action × actor (10 × 6 × 3 = 180 กรณี)
func TestNextStatesEveryCombination(t *testing.T) {
	for _, s := range allStates {
		for _, a := range allActions {
			for _, r := range allActors {
				key := fmt.Sprintf("%s/%s/%s", s, a, r)
				t.Run(key, func(t *testing.T) {
					got, err := NextStates(s, a, r)
					want, ok := allowed[key]
					if !ok {
						appErr, isApp := domain.AsAppError(err)
						if !isApp || appErr.Code != domain.CodeDealStateConflict {
							t.Fatalf("want DEAL_STATE_CONFLICT, got %v %v", got, err)
						}
						return
					}
					if err != nil || !slices.Equal(got, want) {
						t.Fatalf("got %v %v, want %v", got, err, want)
					}
				})
			}
		}
	}
}

func TestNextStatesReturnsCopy(t *testing.T) {
	got, _ := NextStates(domain.StateFundsLocked, domain.ActionConfirmViewing, domain.RoleTenant)
	got[0] = domain.StateRejected
	again, _ := NextStates(domain.StateFundsLocked, domain.ActionConfirmViewing, domain.RoleTenant)
	if again[0] != domain.StateViewingConfirmed {
		t.Fatal("caller mutated the transition table")
	}
}

func TestAllowedActionsMatchesFrontend(t *testing.T) {
	A := func(a ...domain.Action) []domain.Action { return a }
	tests := []struct {
		state domain.DealState
		role  domain.Role
		want  []domain.Action
	}{
		{domain.StateWaitingAccept, domain.RoleTenant, A(domain.ActionLock, domain.ActionReject)},
		{domain.StateWaitingAccept, domain.RoleLandlord, A()},
		{domain.StateFundsLocked, domain.RoleTenant, A(domain.ActionConfirmViewing, domain.ActionCancel, domain.ActionReportIssue)},
		{domain.StateFundsLocked, domain.RoleLandlord, A(domain.ActionCancel)},
		{domain.StateBookingFeeReleased, domain.RoleTenant, A(domain.ActionConfirmMoveIn, domain.ActionCancel)},
		{domain.StateBookingFeeReleased, domain.RoleLandlord, A(domain.ActionCancel)},
		{domain.StateReleased, domain.RoleTenant, A()},
		{domain.StateRejected, domain.RoleLandlord, A()},
	}
	for _, tt := range tests {
		if got := AllowedActions(tt.state, tt.role); !slices.Equal(got, tt.want) {
			t.Errorf("%s/%s = %v, want %v", tt.state, tt.role, got, tt.want)
		}
	}
}

func TestNextActor(t *testing.T) {
	for _, s := range allStates {
		got := NextActor(s)
		if IsActive(s) != (got != nil) {
			t.Errorf("%s: active=%v nextActor=%v", s, IsActive(s), got)
		}
		if got != nil && *got != domain.RoleTenant {
			t.Errorf("%s: nextActor = %s", s, *got)
		}
	}
}
