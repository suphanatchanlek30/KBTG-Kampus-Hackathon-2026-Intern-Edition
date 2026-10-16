package domain

// DealState ตรงกับ enum deal_state ใน DB (docs/04-database.md §2)
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

// Action ที่ผู้ใช้ (หรือระบบ) ทำกับดีล — ชื่อตรงกับ allowedActions ใน DealDTO
type Action string

const (
	ActionReject         Action = "REJECT"
	ActionLock           Action = "LOCK"
	ActionConfirmViewing Action = "CONFIRM_VIEWING"
	ActionConfirmMoveIn  Action = "CONFIRM_MOVE_IN"
	ActionCancel         Action = "CANCEL"
	ActionReportIssue    Action = "REPORT_ISSUE"
	ActionExpire         Action = "EXPIRE" // SYSTEM เท่านั้น (expiry worker — Phase 8)
)

// RoleSystem ใช้กับ action ของ expiry worker (ไม่มีผู้ใช้คนไหนเป็น role นี้)
const RoleSystem Role = "SYSTEM"
