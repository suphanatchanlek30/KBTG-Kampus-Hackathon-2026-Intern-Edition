// Mock API ที่ "ขยับ state ได้" ในหน่วยความจำ (Phase 2) — สัญญาเดียวกับ docs/05-api.md
// เก็บใน sessionStorage ให้รีเฟรชหน้าแล้วยังอยู่ · อ่าน storage เฉพาะตอนถูกเรียก (ไม่ใช่ตอนโหลด module)

import { ApiError } from "@/lib/api/errors";
import type {
  CreateDealInput,
  DealDTO,
  InviteSentDTO,
  DealState,
  HomeDTO,
  MeDTO,
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
  } catch {
    // sessionStorage ใช้ไม่ได้ (private mode) → เริ่มใหม่
  }
  db ??= { role: "LANDLORD", ...SCENARIOS.invited };
  return db;
}

function save(next: MockDb) {
  db = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ไม่เป็นไร — state ยังอยู่ในหน่วยความจำ
  }
}

const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

function currentDeal(state = load()): DealDTO | null {
  if (!state.dealState) return null;
  const deal = makeDeal(state.dealState, state.role, state.input ?? undefined);
  if (!state.inviteSent && deal.invite) deal.invite = { ...deal.invite, sentAt: null };
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
  getMe: async (): Promise<MeDTO> => delay(makeMe(load().role, currentDeal())),

  getHome: async (): Promise<HomeDTO> => delay(makeHome(load().role, currentDeal())),

  getDeal: async (id: string): Promise<DealDTO> => delay(requireDeal(id)),

  /** T2 — รับรหัสดีล `KS-8F4Q21` หรือ id */
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

  /** T8 — โอนหาคู่ดีลที่ยังไม่จบ → เตือน */
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
