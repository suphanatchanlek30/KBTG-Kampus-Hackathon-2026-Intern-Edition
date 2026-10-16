// ข้อมูลเดโมที่ค่าตรงกับ mockup ทุกตัว (docs/01-user-flow.md §2)
// ใช้ทั้ง mock API (Phase 2) และหน้า /dev/overlay ที่ต้อง render หลาย state พร้อมกัน

import { dealExpiry } from "@/features/deals/rules";
import type {
  AccountDTO,
  PayeeDTO,
  CreateDealInput,
  DealDTO,
  DealState,
  HomeDTO,
  MeDTO,
  PendingInviteDTO,
  PropertyDTO,
  Role,
} from "@/types/api";

/** เวลาที่แต่ละ action เกิดใน mockup — mock API ใช้ค่านี้แทนเวลาจริง ให้วันที่ตรงภาพ */
export const DEMO_TIMES = {
  dealCreated: "2026-10-14T10:24:00+07:00",
  inviteSent: "2026-10-14T10:26:00+07:00",
  inviteExpires: "2026-10-15T10:24:00+07:00",
  fundsLocked: "2026-10-14T10:31:00+07:00",
  viewingAt: "2026-10-18T14:00:00+07:00",
  bookingFeeReleased: "2026-10-18T14:42:00+07:00",
  moveInDate: "2026-11-01",
  mainDepositReleased: "2026-11-01T11:05:00+07:00",
  dealExpires: "2026-11-03T23:59:00+07:00",
} as const;

export const DEMO_AMOUNTS = {
  totalSatang: 650_000,
  bookingFeeSatang: 100_000,
  mainDepositSatang: 550_000,
  landlordBalanceSatang: 4_285_000,
  tenantBalanceSatang: 2_850_000,
} as const;

export const DEMO_PROPERTY: PropertyDTO = {
  id: "prop-a1203",
  propertyType: "คอนโด",
  projectName: "The Park สุขุมวิท 64",
  unitNo: "A1203",
  detailLabel: "1 ห้องนอน · 28 ตร.ม. · ชั้น 12",
  nearbyLabel: "BTS ปุณณวิถี",
};

export const DEMO_USERS = {
  LANDLORD: {
    user: { id: "user-landlord", role: "LANDLORD", displayName: "สมชาย ใจดี", shortName: "สมชาย ใ." },
    account: {
      id: "acct-landlord",
      bankName: "กสิกรไทย",
      accountType: "ออมทรัพย์",
      accountNoMasked: "xxx-x-x4821",
    },
  },
  TENANT: {
    user: { id: "user-tenant", role: "TENANT", displayName: "ณัฐธิดา ศรีสุข", shortName: "ณัฐธิดา ศ." },
    account: {
      id: "acct-tenant",
      bankName: "กสิกรไทย",
      accountType: "ออมทรัพย์",
      accountNoMasked: "xxx-x-x1432",
    },
  },
} as const satisfies Record<Role, { user: MeDTO["user"]; account: Omit<AccountDTO, `${string}Satang`> }>;

export const DEMO_DEAL_ID = "deal-ks-0458";
export const DEMO_SHARE_CODE = "KS-8F4Q21";

/** ลำดับ state บนเส้นทางสำเร็จ — ใช้สร้าง fixture ของ state ใดก็ได้ */
const HAPPY_PATH: DealState[] = ["WAITING_ACCEPT", "FUNDS_LOCKED", "BOOKING_FEE_RELEASED", "RELEASED"];
const reached = (state: DealState, target: DealState) =>
  HAPPY_PATH.indexOf(state) >= HAPPY_PATH.indexOf(target) && HAPPY_PATH.includes(state);

/** ดีลตัวอย่างใน state ที่ระบุ มองจากมุมของ `role` */
export function makeDeal(state: DealState, role: Role, input?: Partial<CreateDealInput>): DealDTO {
  const totalSatang = input?.totalSatang ?? DEMO_AMOUNTS.totalSatang;
  const bookingFeeSatang = input?.bookingFeeSatang ?? DEMO_AMOUNTS.bookingFeeSatang;
  const mainDepositSatang = totalSatang - bookingFeeSatang;
  const viewingAt = input?.viewingAt ?? DEMO_TIMES.viewingAt;
  const moveInDate = input?.moveInDate ?? DEMO_TIMES.moveInDate;
  const locked = reached(state, "FUNDS_LOCKED");
  const bookingReleased = reached(state, "BOOKING_FEE_RELEASED");
  const allReleased = state === "RELEASED";
  const releasedSatang = allReleased ? totalSatang : bookingReleased ? bookingFeeSatang : 0;

  const timeline: DealDTO["timeline"] = [
    { type: "DEAL_CREATED", at: DEMO_TIMES.dealCreated, amountSatang: null },
    { type: "INVITE_SENT", at: DEMO_TIMES.inviteSent, amountSatang: null },
  ];
  if (locked) timeline.push({ type: "FUNDS_LOCKED", at: DEMO_TIMES.fundsLocked, amountSatang: totalSatang });
  if (bookingReleased)
    timeline.push({ type: "BOOKING_FEE_RELEASED", at: DEMO_TIMES.bookingFeeReleased, amountSatang: bookingFeeSatang });
  if (allReleased)
    timeline.push({
      type: "MAIN_DEPOSIT_RELEASED",
      at: DEMO_TIMES.mainDepositReleased,
      amountSatang: mainDepositSatang,
    });

  const trancheStatus = (isReleased: boolean) => (isReleased ? "RELEASED" : locked ? "HELD" : "PENDING");

  const nextActor: Role | null =
    state === "WAITING_ACCEPT" || state === "FUNDS_LOCKED" || state === "BOOKING_FEE_RELEASED" ? "TENANT" : null;

  const allowedActions: DealDTO["allowedActions"] =
    role === "TENANT"
      ? state === "WAITING_ACCEPT"
        ? ["LOCK", "REJECT"]
        : state === "FUNDS_LOCKED"
          ? ["CONFIRM_VIEWING", "CANCEL", "REPORT_ISSUE"]
          : state === "BOOKING_FEE_RELEASED"
            ? ["CONFIRM_MOVE_IN", "CANCEL"]
            : []
      : state === "FUNDS_LOCKED" || state === "BOOKING_FEE_RELEASED"
        ? ["CANCEL"]
        : [];

  const landlord = DEMO_USERS.LANDLORD;
  const tenant = DEMO_USERS.TENANT;

  return {
    id: DEMO_DEAL_ID,
    refNo: "KS-691014-0458",
    shareCode: DEMO_SHARE_CODE,
    state,
    version: HAPPY_PATH.indexOf(state) + 1,
    dealType: "RENTAL_DEPOSIT",
    property: DEMO_PROPERTY,
    landlord: {
      displayName: landlord.user.displayName,
      shortName: landlord.user.shortName,
      bankName: landlord.account.bankName,
      accountNoMasked: landlord.account.accountNoMasked,
      nameVerified: true,
    },
    tenant:
      role === "LANDLORD" && !locked
        ? null
        : {
            displayName: tenant.user.displayName,
            shortName: tenant.user.shortName,
            accountNoMasked: tenant.account.accountNoMasked,
          },
    amounts: {
      totalSatang,
      bookingFeeSatang,
      mainDepositSatang,
      feeSatang: 0,
      releasedSatang,
      heldSatang: locked ? totalSatang - releasedSatang : 0,
      refundedSatang: 0,
    },
    tranches: [
      {
        key: "BOOKING_FEE",
        amountSatang: bookingFeeSatang,
        status: trancheStatus(bookingReleased),
        releasedAt: bookingReleased ? DEMO_TIMES.bookingFeeReleased : null,
      },
      {
        key: "MAIN_DEPOSIT",
        amountSatang: mainDepositSatang,
        status: trancheStatus(allReleased),
        releasedAt: allReleased ? DEMO_TIMES.mainDepositReleased : null,
      },
    ],
    viewingAt,
    moveInDate,
    expiresAt: input?.moveInDate ? dealExpiry(moveInDate) : DEMO_TIMES.dealExpires,
    invite: { expiresAt: DEMO_TIMES.inviteExpires, sentAt: DEMO_TIMES.inviteSent },
    cancel: { landlordRequestedAt: null, tenantRequestedAt: null },
    hasOpenIssue: false,
    myRole: role,
    nextActor,
    allowedActions,
    timeline,
    createdAt: DEMO_TIMES.dealCreated,
  };
}

/** ยอดบัญชีของ role ตาม state ของดีล (คำนวณแบบเดียวกับ ledger ใน docs/04-database.md §2) */
export function makeMe(role: Role, deal: DealDTO | null, unreadNotifications = 1): MeDTO {
  const base = DEMO_USERS[role];
  const released = deal?.amounts.releasedSatang ?? 0;
  const held = deal?.amounts.heldSatang ?? 0;
  const balanceSatang =
    role === "LANDLORD" ? DEMO_AMOUNTS.landlordBalanceSatang + released : DEMO_AMOUNTS.tenantBalanceSatang - released;
  const heldSatang = role === "TENANT" ? held : 0;
  return {
    user: { ...base.user },
    account: { ...base.account, balanceSatang, heldSatang, availableSatang: balanceSatang - heldSatang },
    unreadNotifications,
  };
}

export function makePendingInvite(deal: DealDTO): PendingInviteDTO {
  return {
    dealId: deal.id,
    fromShortName: deal.landlord.shortName,
    sentAt: deal.invite?.sentAt ?? deal.createdAt,
    projectName: deal.property.projectName,
    unitNo: deal.property.unitNo,
    viewingAt: deal.viewingAt,
    totalSatang: deal.amounts.totalSatang,
    shareCode: deal.shareCode,
  };
}

export function makeHome(role: Role, deal: DealDTO | null): HomeDTO {
  // ดีลที่ยังไม่จบ — ผู้ให้เช่าเห็นตั้งแต่สร้างคำขอ (รอผู้เช่า) · ผู้เช่าเห็นหลังกันเงินแล้ว
  const activeStates =
    role === "LANDLORD"
      ? ["WAITING_ACCEPT", "FUNDS_LOCKED", "BOOKING_FEE_RELEASED"]
      : ["FUNDS_LOCKED", "BOOKING_FEE_RELEASED"];
  const active = deal && activeStates.includes(deal.state);
  return {
    me: makeMe(role, deal),
    pendingInvites:
      role === "TENANT" && deal?.state === "WAITING_ACCEPT" && deal.invite?.sentAt ? [makePendingInvite(deal)] : [],
    activeDeals:
      deal && active
        ? [
            {
              dealId: deal.id,
              state: deal.state,
              projectName: deal.property.projectName,
              unitNo: deal.property.unitNo,
              totalSatang: deal.amounts.totalSatang,
            },
          ]
        : [],
  };
}

/** T8 — ผู้รับโอนคือผู้ให้เช่าของดีลที่ยังไม่จบ ("ค่าส่วนกลางล่วงหน้า" = มุกที่มิจฉาชีพใช้บ่อย) */
export const DEMO_TRANSFER: { payee: PayeeDTO; amountSatang: number; memo: string } = {
  payee: {
    accountId: DEMO_USERS.LANDLORD.account.id,
    displayName: DEMO_USERS.LANDLORD.user.displayName,
    bankName: DEMO_USERS.LANDLORD.account.bankName,
    accountNoMasked: DEMO_USERS.LANDLORD.account.accountNoMasked,
  },
  amountSatang: 300_000,
  memo: "ค่าส่วนกลางล่วงหน้า",
};
