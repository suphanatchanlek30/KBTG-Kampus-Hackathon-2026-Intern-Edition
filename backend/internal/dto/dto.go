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

// ---- Deal (docs/05-api.md §3 DealDTO) ----

type DealPropertyDTO struct {
	ID           string `json:"id"`
	PropertyType string `json:"propertyType"`
	ProjectName  string `json:"projectName"`
	UnitNo       string `json:"unitNo"`
	DetailLabel  string `json:"detailLabel"`
	NearbyLabel  string `json:"nearbyLabel"`
}

type PartyDTO struct {
	DisplayName     string `json:"displayName"`
	ShortName       string `json:"shortName"`
	BankName        string `json:"bankName,omitempty"`
	AccountNoMasked string `json:"accountNoMasked"`
	NameVerified    *bool  `json:"nameVerified,omitempty"`
}

type DealAmountsDTO struct {
	TotalSatang       int64 `json:"totalSatang"`
	BookingFeeSatang  int64 `json:"bookingFeeSatang"`
	MainDepositSatang int64 `json:"mainDepositSatang"`
	FeeSatang         int64 `json:"feeSatang"`
	ReleasedSatang    int64 `json:"releasedSatang"`
	HeldSatang        int64 `json:"heldSatang"`
	RefundedSatang    int64 `json:"refundedSatang"`
}

type TrancheDTO struct {
	Key          string  `json:"key"`
	AmountSatang int64   `json:"amountSatang"`
	Status       string  `json:"status"`
	ReleasedAt   *string `json:"releasedAt"`
}

type InviteDTO struct {
	ExpiresAt string `json:"expiresAt"`
	// ส่งเฉพาะตอนสร้าง/ออกใหม่ — DB เก็บแค่ hash ของ token จึงอ่านซ้ำไม่ได้
	QrURL  string  `json:"qrUrl,omitempty"`
	SentAt *string `json:"sentAt"`
}

type CancelDTO struct {
	LandlordRequestedAt *string `json:"landlordRequestedAt"`
	TenantRequestedAt   *string `json:"tenantRequestedAt"`
}

type TimelineItemDTO struct {
	Type         string `json:"type"`
	At           string `json:"at"`
	AmountSatang *int64 `json:"amountSatang"`
}

// AccountBalanceDTO แนบมากับคำตอบของ lock (T4 "ยอดที่ใช้ได้ตอนนี้")
type AccountBalanceDTO struct {
	AvailableSatang int64 `json:"availableSatang"`
	HeldSatang      int64 `json:"heldSatang"`
}

type DealDTO struct {
	ID             string             `json:"id"`
	RefNo          string             `json:"refNo"`
	ShareCode      string             `json:"shareCode"`
	State          string             `json:"state"`
	Version        int32              `json:"version"`
	DealType       string             `json:"dealType"`
	Property       DealPropertyDTO    `json:"property"`
	Landlord       PartyDTO           `json:"landlord"`
	Tenant         *PartyDTO          `json:"tenant"`
	Amounts        DealAmountsDTO     `json:"amounts"`
	Tranches       []TrancheDTO       `json:"tranches"`
	ViewingAt      string             `json:"viewingAt"`
	MoveInDate     string             `json:"moveInDate"`
	ExpiresAt      string             `json:"expiresAt"`
	Invite         *InviteDTO         `json:"invite"`
	Cancel         CancelDTO          `json:"cancel"`
	HasOpenIssue   bool               `json:"hasOpenIssue"`
	MyRole         string             `json:"myRole"`
	NextActor      *string            `json:"nextActor"`
	AllowedActions []string           `json:"allowedActions"`
	Timeline       []TimelineItemDTO  `json:"timeline"`
	CreatedAt      string             `json:"createdAt"`
	Account        *AccountBalanceDTO `json:"account,omitempty"`
}

type DealSummaryDTO struct {
	ID          string `json:"id"`
	RefNo       string `json:"refNo"`
	State       string `json:"state"`
	ProjectName string `json:"projectName"`
	UnitNo      string `json:"unitNo"`
	TotalSatang int64  `json:"totalSatang"`
	MyRole      string `json:"myRole"`
	CreatedAt   string `json:"createdAt"`
}

type DealListDTO struct {
	Items []DealSummaryDTO `json:"items"`
}

type InviteSentDTO struct {
	SentTo struct {
		ShortName string `json:"shortName"`
	} `json:"sentTo"`
	SentAt string `json:"sentAt"`
}

type UserLookupDTO struct {
	ShortName string `json:"shortName"`
}
