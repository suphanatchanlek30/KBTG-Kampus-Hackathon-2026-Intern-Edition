package domain

type DealState string

const (
	StateWaitingAccept      DealState = "WAITING_ACCEPT"
	StateRejected           DealState = "REJECTED"
	StateFundsLocked        DealState = "FUNDS_LOCKED"
	StateViewingConfirmed   DealState = "VIEWING_CONFIRMED"
	StateBookingFeeReleased DealState = "BOOKING_FEE_RELEASED"
	StateMoveInConfirmed    DealState = "MOVE_IN_CONFIRMED"
	StateReleased           DealState = "RELEASED"
	StateExpired            DealState = "EXPIRED"
	StateCancelled          DealState = "CANCELLED"
	StateRefunded           DealState = "REFUNDED"
)

type Action string

const (
	ActionReject         Action = "REJECT"
	ActionLock           Action = "LOCK"
	ActionConfirmViewing Action = "CONFIRM_VIEWING"
	ActionConfirmMoveIn  Action = "CONFIRM_MOVE_IN"
	ActionCancel         Action = "CANCEL"
	ActionReportIssue    Action = "REPORT_ISSUE"
	ActionExpire         Action = "EXPIRE" // Reserved for the expiry worker.
)

const RoleSystem Role = "SYSTEM"
