// Package dto คือรูปร่าง JSON ที่ตอบ frontend — ต้องตรงกับ docs/05-api.md §3 และ frontend/src/types/api.ts
// เงินเป็น int64 สตางค์ · เวลาเป็น string ISO-8601 มี offset (+07:00) · วันล้วน "2026-11-01"
package dto

type UserDTO struct {
	ID          string `json:"id"`
	Role        string `json:"role"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName"`
}

type AccountDTO struct {
	ID              string `json:"id"`
	BankName        string `json:"bankName"`
	AccountType     string `json:"accountType"`
	AccountNoMasked string `json:"accountNoMasked"`
	BalanceSatang   int64  `json:"balanceSatang"`
	HeldSatang      int64  `json:"heldSatang"`
	AvailableSatang int64  `json:"availableSatang"`
}

type MeDTO struct {
	User                UserDTO    `json:"user"`
	Account             AccountDTO `json:"account"`
	UnreadNotifications int64      `json:"unreadNotifications"`
}

type LoginDTO struct {
	User UserDTO `json:"user"`
}

type PendingInviteDTO struct {
	DealID        string `json:"dealId"`
	FromShortName string `json:"fromShortName"`
	SentAt        string `json:"sentAt"`
	ProjectName   string `json:"projectName"`
	UnitNo        string `json:"unitNo"`
	ViewingAt     string `json:"viewingAt"`
	TotalSatang   int64  `json:"totalSatang"`
	ShareCode     string `json:"shareCode"`
}

type ActiveDealDTO struct {
	DealID      string `json:"dealId"`
	State       string `json:"state"`
	ProjectName string `json:"projectName"`
	UnitNo      string `json:"unitNo"`
	TotalSatang int64  `json:"totalSatang"`
}

type HomeDTO struct {
	Me             MeDTO              `json:"me"`
	PendingInvites []PendingInviteDTO `json:"pendingInvites"`
	ActiveDeals    []ActiveDealDTO    `json:"activeDeals"`
}

type PropertyDTO struct {
	ID           string `json:"id"`
	PropertyType string `json:"propertyType"`
	ProjectName  string `json:"projectName"`
	UnitNo       string `json:"unitNo"`
	DetailLabel  string `json:"detailLabel"`
	NearbyLabel  string `json:"nearbyLabel"`
}

type PropertiesDTO struct {
	Items []PropertyDTO `json:"items"`
}

type NotificationDTO struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"`
	DealID    *string `json:"dealId"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	ReadAt    *string `json:"readAt"`
	CreatedAt string  `json:"createdAt"`
}

type NotificationsDTO struct {
	Items       []NotificationDTO `json:"items"`
	UnreadCount int64             `json:"unreadCount"`
}

type UnreadCountDTO struct {
	UnreadCount int64 `json:"unreadCount"`
}

type DemoResetDTO struct {
	Scenario string  `json:"scenario"`
	DealID   *string `json:"dealId"`
}
