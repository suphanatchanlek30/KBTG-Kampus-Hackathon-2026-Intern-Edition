export type Role = "LANDLORD" | "TENANT";

export type DealState =
  "WAITING_ACCEPT" | "REJECTED" | "FUNDS_LOCKED" | "BOOKING_FEE_RELEASED" | "RELEASED" | "EXPIRED" | "REFUNDED";

export type DealEventType =
  | "DEAL_CREATED"
  | "INVITE_SENT"
  | "DEAL_ACCEPTED"
  | "DEAL_REJECTED"
  | "FUNDS_LOCKED"
  | "VIEWING_CONFIRMED"
  | "BOOKING_FEE_RELEASED"
  | "MOVE_IN_CONFIRMED"
  | "MAIN_DEPOSIT_RELEASED"
  | "CANCEL_REQUESTED"
  | "DEAL_CANCELLED"
  | "DEAL_EXPIRED"
  | "FUNDS_REFUNDED"
  | "ISSUE_REPORTED";

export type DealAction = "REJECT" | "LOCK" | "CONFIRM_VIEWING" | "CONFIRM_MOVE_IN" | "CANCEL" | "REPORT_ISSUE";

export type TrancheKey = "BOOKING_FEE" | "MAIN_DEPOSIT";
export type TrancheStatus = "PENDING" | "HELD" | "RELEASED" | "REFUNDED";

export type PropertyDTO = {
  id: string;
  propertyType: string;
  projectName: string;
  unitNo: string;
  detailLabel: string;
  nearbyLabel: string;
};

export type PartyDTO = {
  displayName: string;
  shortName: string;
  bankName?: string;
  accountNoMasked: string;
  nameVerified?: boolean;
};

export type DealDTO = {
  id: string;
  refNo: string;
  shareCode: string;
  state: DealState;
  version: number;
  dealType: "RENTAL_DEPOSIT";
  property: PropertyDTO;
  landlord: PartyDTO;
  tenant: PartyDTO | null;
  amounts: {
    totalSatang: number;
    bookingFeeSatang: number;
    mainDepositSatang: number;
    feeSatang: number;
    releasedSatang: number;
    heldSatang: number;
    refundedSatang: number;
  };
  tranches: { key: TrancheKey; amountSatang: number; status: TrancheStatus; releasedAt: string | null }[];
  viewingAt: string;
  moveInDate: string;
  expiresAt: string;
  invite: { expiresAt: string; qrUrl?: string; sentAt?: string | null } | null;
  cancel: { landlordRequestedAt: string | null; tenantRequestedAt: string | null };
  hasOpenIssue: boolean;
  myRole: Role;
  nextActor: Role | null;
  allowedActions: DealAction[];
  timeline: { type: DealEventType; at: string; amountSatang: number | null }[];
  createdAt: string;
};

export type AccountDTO = {
  id: string;
  bankName: string;
  accountType: string;
  accountNoMasked: string;
  balanceSatang: number;
  heldSatang: number;
  availableSatang: number;
};

export type MeDTO = {
  // sandbox is true when signed in to a visitor's private demo sandbox.
  user: { id: string; role: Role; displayName: string; shortName: string; sandbox?: boolean };
  account: AccountDTO;
  unreadNotifications: number;
};

export type PendingInviteDTO = {
  dealId: string;
  fromShortName: string;
  sentAt: string;
  projectName: string;
  unitNo: string;
  viewingAt: string;
  totalSatang: number;
  shareCode: string;
};

export type HomeDTO = {
  me: MeDTO;
  pendingInvites: PendingInviteDTO[];
  activeDeals: { dealId: string; state: DealState; projectName: string; unitNo: string; totalSatang: number }[];
};

export type DealSummaryDTO = {
  id: string;
  refNo: string;
  state: DealState;
  projectName: string;
  unitNo: string;
  totalSatang: number;
  myRole: Role;
  createdAt: string;
};

export type CreateDealInput = {
  propertyId: string;
  totalSatang: number;
  bookingFeeSatang: number;
  viewingAt: string;
  moveInDate: string;
};

export type TransferPrecheckDTO = {
  warning: { code: "OFF_DEAL_PAYMENT"; dealId: string; unitNo: string; message: string } | null;
};

export type PayeeDTO = { accountId: string; displayName: string; bankName: string; accountNoMasked: string };

/** Request body for POST /deals/{id}/invite/send. */
export type InviteSentDTO = { sentTo: { shortName: string }; sentAt: string };

/** Request body for POST /transfers. */
export type TransferResultDTO = {
  id: string;
  status: "COMPLETED_SIMULATED" | "CANCELLED_BY_USER";
  warningShown: boolean;
};

/** Request body for POST /auth/demo-login. */
export type LoginDTO = { user: MeDTO["user"] };

export type DemoScenario = "fresh" | "waiting_accept" | "funds_locked" | "booking_released" | "released";

/** Response body for GET /notifications. */
export type NotificationType =
  | "DEAL_INVITE"
  | "FUNDS_LOCKED"
  | "BOOKING_FEE_RELEASED"
  | "MAIN_DEPOSIT_RELEASED"
  | "DEAL_REJECTED"
  | "CANCEL_REQUESTED"
  | "DEAL_REFUNDED"
  | "DEAL_EXPIRED";

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  dealId: string | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsDTO = { items: NotificationDTO[]; unreadCount: number };

export type SandboxDTO = {
  sandboxId: string;
  scenario: DemoScenario;
  dealId: string | null;
  shareCode: string | null;
};
