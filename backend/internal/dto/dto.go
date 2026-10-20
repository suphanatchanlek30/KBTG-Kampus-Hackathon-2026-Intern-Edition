package dto

type UserDTO struct {
	ID          string `json:"id"`
	Role        string `json:"role"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName"`
	// Sandbox is true for a visitor's private demo sandbox; omitted for the shared accounts.
	Sandbox bool `json:"sandbox,omitempty"`
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

type SandboxDTO struct {
	SandboxID string  `json:"sandboxId"`
	Scenario  string  `json:"scenario"`
	DealID    *string `json:"dealId"`
	ShareCode *string `json:"shareCode"`
}

type DemoResetDTO struct {
	Scenario string  `json:"scenario"`
	DealID   *string `json:"dealId"`
}

// Deal

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
	ExpiresAt string  `json:"expiresAt"`
	QrURL     string  `json:"qrUrl,omitempty"`
	SentAt    *string `json:"sentAt"`
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

func (d DealDTO) Redacted() any {
	if d.Invite != nil && d.Invite.QrURL != "" {
		inv := *d.Invite
		inv.QrURL = ""
		d.Invite = &inv
	}
	return d
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

// Transfer

type PayeeDTO struct {
	AccountID       string `json:"accountId"`
	DisplayName     string `json:"displayName"`
	BankName        string `json:"bankName"`
	AccountNoMasked string `json:"accountNoMasked"`
}

type PayeesDTO struct {
	Items []PayeeDTO `json:"items"`
}

type TransferWarningDTO struct {
	Code    string `json:"code"`
	DealID  string `json:"dealId"`
	UnitNo  string `json:"unitNo"`
	Message string `json:"message"`
}

type TransferPrecheckDTO struct {
	Warning *TransferWarningDTO `json:"warning"`
}

type TransferDTO struct {
	ID           string `json:"id"`
	Status       string `json:"status"`
	WarningShown bool   `json:"warningShown"`
}
