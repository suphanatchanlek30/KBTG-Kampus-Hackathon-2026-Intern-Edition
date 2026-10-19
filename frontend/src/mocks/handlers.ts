import { ApiError } from "@/lib/api/errors";
import { brand } from "@/config/brand";
import { formatBaht } from "@/lib/format/money";
import type {
  CreateDealInput,
  DealDTO,
  InviteSentDTO,
  DealState,
  HomeDTO,
  MeDTO,
  NotificationDTO,
  NotificationsDTO,
  Role,
  TransferPrecheckDTO,
} from "@/types/api";
import { DEMO_DEAL_ID, DEMO_SHARE_CODE, DEMO_TIMES, DEMO_USERS, makeDeal, makeHome, makeMe } from "./fixtures";

export type MockScenario = "invited" | "fresh" | "locked" | "booking-released" | "released";

type MockDb = {
  role: Role;
  dealState: DealState | null;
  inviteSent: boolean;
  input: CreateDealInput | null;
  cancelBy?: Role | null;
  issue?: boolean;
  endedFrom?: DealState | null;
  notificationsRead?: boolean;
};

const STORAGE_KEY = "ks-mock-db";
const LATENCY_MS = 350;

const SCENARIOS: Record<MockScenario, Omit<MockDb, "role">> = {
  invited: { dealState: "WAITING_ACCEPT", inviteSent: true, input: null },
  fresh: { dealState: null, inviteSent: false, input: null },
  locked: { dealState: "FUNDS_LOCKED", inviteSent: true, input: null },
  "booking-released": { dealState: "BOOKING_FEE_RELEASED", inviteSent: true, input: null },
  released: { dealState: "RELEASED", inviteSent: true, input: null },
};

let db: MockDb | null = null;

function load(): MockDb {
  if (db) return db;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) db = JSON.parse(raw) as MockDb;
  } catch {}
  db ??= { role: "LANDLORD", ...SCENARIOS.invited };
  return db;
}

function save(next: MockDb) {
  db = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

const NOW = () => new Date().toISOString();
const other = (role: Role): Role => (role === "LANDLORD" ? "TENANT" : "LANDLORD");

function currentDeal(state = load()): DealDTO | null {
  if (!state.dealState) return null;
  const ended = state.dealState === "REFUNDED" || state.dealState === "EXPIRED";
  const deal = makeDeal(
    ended ? (state.endedFrom ?? "WAITING_ACCEPT") : state.dealState,
    state.role,
    state.input ?? undefined,
  );
  if (!state.inviteSent && deal.invite) deal.invite = { ...deal.invite, sentAt: null };

  if (ended) {
    const refunded = deal.amounts.heldSatang;
    deal.state = state.dealState;
    deal.amounts = { ...deal.amounts, heldSatang: 0, refundedSatang: refunded };
    deal.tranches = deal.tranches.map((t) => (t.status === "HELD" ? { ...t, status: "REFUNDED" } : t));
    deal.timeline = [
      ...deal.timeline,
      { type: state.cancelBy ? "DEAL_CANCELLED" : "DEAL_EXPIRED", at: NOW(), amountSatang: null },
      ...(refunded > 0 ? [{ type: "FUNDS_REFUNDED" as const, at: NOW(), amountSatang: refunded }] : []),
    ];
    deal.allowedActions = [];
    deal.nextActor = null;
    return deal;
  }

  if (state.cancelBy) {
    const at = DEMO_TIMES.fundsLocked;
    deal.cancel =
      state.cancelBy === "LANDLORD"
        ? { landlordRequestedAt: at, tenantRequestedAt: null }
        : { landlordRequestedAt: null, tenantRequestedAt: at };
    if (state.cancelBy === state.role) deal.allowedActions = deal.allowedActions.filter((a) => a !== "CANCEL");
    deal.nextActor = other(state.cancelBy);
  }
  if (state.issue) {
    deal.hasOpenIssue = true;
    deal.allowedActions = deal.allowedActions.filter((a) => a !== "REPORT_ISSUE");
  }
  return deal;
}

function requireDeal(id: string): DealDTO {
  const deal = currentDeal();
  if (!deal || (id !== deal.id && id !== deal.shareCode)) throw new ApiError("NOT_FOUND", 404);
  return deal;
}

async function transition(id: string, role: Role, from: DealState, to: DealState): Promise<DealDTO> {
  const state = load();
  const deal = requireDeal(id);
  if (state.role !== role) throw new ApiError("FORBIDDEN_ROLE", 403);
  if (deal.state !== from) throw new ApiError("DEAL_STATE_CONFLICT", 409);
  save({ ...state, dealState: to });
  return delay(currentDeal()!);
}

export const mockApi = {
  getMe: async (): Promise<MeDTO> => delay(makeMe(load().role, currentDeal(), load().notificationsRead ? 0 : 1)),

  getHome: async (): Promise<HomeDTO> => {
    const home = makeHome(load().role, currentDeal());
    home.me.unreadNotifications = load().notificationsRead ? 0 : 1;
    return delay(home);
  },

  getDeal: async (id: string): Promise<DealDTO> => delay(requireDeal(id)),

  getInvite: async (code: string): Promise<DealDTO> => {
    const deal = currentDeal();
    const normalized = decodeURIComponent(code).trim().toUpperCase();
    if (!deal || (normalized !== DEMO_SHARE_CODE && code !== DEMO_DEAL_ID))
      throw new ApiError("NOT_FOUND", 404, "รหัสดีลไม่ถูกต้อง");
    return delay(deal);
  },

  createDeal: async (input: CreateDealInput): Promise<DealDTO> => {
    const state = load();
    if (state.role !== "LANDLORD") throw new ApiError("FORBIDDEN_ROLE", 403);
    if (!(input.bookingFeeSatang > 0 && input.bookingFeeSatang < input.totalSatang))
      throw new ApiError("VALIDATION_FAILED", 400);
    save({ ...state, dealState: "WAITING_ACCEPT", inviteSent: false, input });
    return delay(currentDeal()!);
  },

  sendInvite: async (id: string): Promise<InviteSentDTO> => {
    const state = load();
    const deal = requireDeal(id);
    save({ ...state, inviteSent: true });
    return delay({
      sentTo: { shortName: deal.tenant?.shortName ?? DEMO_USERS.TENANT.user.shortName },
      sentAt: DEMO_TIMES.inviteSent,
    });
  },

  rejectDeal: (id: string) => transition(id, "TENANT", "WAITING_ACCEPT", "REJECTED"),
  lockDeal: (id: string) => transition(id, "TENANT", "WAITING_ACCEPT", "FUNDS_LOCKED"),
  confirmViewing: (id: string) => transition(id, "TENANT", "FUNDS_LOCKED", "BOOKING_FEE_RELEASED"),
  confirmMoveIn: (id: string) => transition(id, "TENANT", "BOOKING_FEE_RELEASED", "RELEASED"),

  cancelDeal: async (id: string): Promise<DealDTO> => {
    const state = load();
    const deal = requireDeal(id);
    if (deal.state !== "FUNDS_LOCKED" && deal.state !== "BOOKING_FEE_RELEASED")
      throw new ApiError("DEAL_STATE_CONFLICT", 409);
    if (state.cancelBy === state.role)
      throw new ApiError("DEAL_STATE_CONFLICT", 409, "คุณขอยกเลิกไปแล้ว รออีกฝ่ายยินยอม");
    save(
      state.cancelBy ? { ...state, dealState: "REFUNDED", endedFrom: deal.state } : { ...state, cancelBy: state.role },
    );
    return delay(currentDeal()!);
  },

  reportIssue: async (id: string): Promise<DealDTO> => {
    const state = load();
    const deal = requireDeal(id);
    if (state.role !== "TENANT") throw new ApiError("FORBIDDEN_ROLE", 403);
    if (deal.state !== "FUNDS_LOCKED" || state.issue) throw new ApiError("DEAL_STATE_CONFLICT", 409);
    save({ ...state, issue: true });
    return delay(currentDeal()!);
  },

  expireNow: async (id: string): Promise<DealDTO> => {
    const state = load();
    const deal = requireDeal(id);
    if (!["WAITING_ACCEPT", "FUNDS_LOCKED", "BOOKING_FEE_RELEASED"].includes(deal.state))
      throw new ApiError("DEAL_STATE_CONFLICT", 409, "ดีลนี้จบไปแล้ว");
    save({
      ...state,
      cancelBy: null,
      dealState: deal.state === "WAITING_ACCEPT" ? "EXPIRED" : "REFUNDED",
      endedFrom: deal.state,
    });
    return delay(currentDeal()!);
  },

  lookupTenant: async (phone: string): Promise<{ shortName: string }> => {
    if (phone.replace(/\D/g, "") !== "0890001432") throw new ApiError("NOT_FOUND", 404, "ไม่พบผู้เช่าที่ใช้เบอร์นี้");
    return delay({ shortName: DEMO_USERS.TENANT.user.shortName });
  },

  getNotifications: async (): Promise<NotificationsDTO> => {
    const state = load();
    const deal = currentDeal(state);
    const items: NotificationDTO[] = [];
    const push = (type: NotificationDTO["type"], title: string, body: string, at: string) =>
      items.unshift({
        id: `n-${items.length}`,
        type,
        dealId: deal?.id ?? null,
        title,
        body,
        readAt: state.notificationsRead ? at : null,
        createdAt: at,
      });
    if (deal) {
      // Build the copy from the deal itself, mirroring backend/internal/service/notification_text.go.
      const landlord = deal.landlord.shortName;
      const tenant = deal.tenant?.shortName ?? "-";
      const unit = deal.property.unitNo;
      const total = formatBaht(deal.amounts.totalSatang);
      const fee = formatBaht(deal.amounts.bookingFeeSatang);
      const main = formatBaht(deal.amounts.mainDepositSatang);
      const copy: Partial<Record<string, [NotificationDTO["type"], string, string]>> =
        state.role === "LANDLORD"
          ? {
              FUNDS_LOCKED: ["FUNDS_LOCKED", "เงินถูกกันไว้แล้ว", `${tenant} กันเงิน ${total} สำหรับห้อง ${unit}`],
              BOOKING_FEE_RELEASED: [
                "BOOKING_FEE_RELEASED",
                `ได้รับค่าจอง ${fee}`,
                `${tenant} ยืนยันดูห้อง ${unit} แล้ว`,
              ],
              MAIN_DEPOSIT_RELEASED: [
                "MAIN_DEPOSIT_RELEASED",
                `ได้รับเงินครบแล้ว ${total}`,
                `${tenant} ยืนยันเข้าอยู่ห้อง ${unit} แล้ว`,
              ],
            }
          : {
              INVITE_SENT: ["DEAL_INVITE", `คำขอ ${brand.name} ใหม่`, `จากคุณ${landlord}`],
              FUNDS_LOCKED: [
                "FUNDS_LOCKED",
                "กันเงินเรียบร้อย",
                `กันเงิน ${total} สำหรับห้อง ${unit} · เงินยังเป็นของคุณจนกว่าจะเข้าอยู่`,
              ],
              BOOKING_FEE_RELEASED: [
                "BOOKING_FEE_RELEASED",
                `ปล่อยค่าจองแล้ว ${fee}`,
                `โอนให้ ${landlord} สำหรับห้อง ${unit} · มัดจำหลักยังกันไว้`,
              ],
              MAIN_DEPOSIT_RELEASED: [
                "MAIN_DEPOSIT_RELEASED",
                `ดีลเสร็จสมบูรณ์ · ปล่อยครบ ${total}`,
                `ปล่อยมัดจำหลัก ${main} ให้ ${landlord} แล้ว · ดูหลักฐานได้`,
              ],
            };
      for (const e of deal.timeline) {
        const c = copy[e.type];
        if (c) push(c[0], c[1], c[2], e.at);
        if (e.type === "FUNDS_REFUNDED")
          push("DEAL_REFUNDED", "คืนเงินแล้ว", "คืนเงินที่ยังกันไว้ให้ผู้เช่าแล้ว", e.at);
      }
    }
    if (state.cancelBy && state.cancelBy !== state.role)
      push(
        "CANCEL_REQUESTED",
        "มีคำขอยกเลิกดีล",
        "อีกฝ่ายขอยกเลิกดีลห้อง A1203 — ยินยอมเพื่อคืนเงินที่ยังกันไว้",
        DEMO_TIMES.fundsLocked,
      );
    return delay({ items, unreadCount: items.filter((n) => !n.readAt).length });
  },

  markAllRead: async (): Promise<{ unreadCount: number }> => {
    save({ ...load(), notificationsRead: true });
    return delay({ unreadCount: 0 });
  },

  precheckTransfer: async (toAccountId: string): Promise<TransferPrecheckDTO> => {
    const deal = currentDeal();
    const open = deal && ["FUNDS_LOCKED", "BOOKING_FEE_RELEASED"].includes(deal.state);
    return delay({
      warning:
        open && toAccountId === "acct-landlord"
          ? {
              code: "OFF_DEAL_PAYMENT",
              dealId: deal.id,
              unitNo: deal.property.unitNo,
              message: `บัญชีนี้เป็นคู่ดีล K Sure ของคุณ (ห้อง ${deal.property.unitNo}) ที่ยังไม่จบ`,
            }
          : null,
    });
  },

  // ---- Demo tools ----
  getRole: (): Role => load().role,
  setRole: (role: Role) => save({ ...load(), role }),
  reset: (scenario: MockScenario = "invited") => save({ role: load().role, ...SCENARIOS[scenario] }),
};
