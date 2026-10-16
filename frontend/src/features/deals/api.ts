// export ฟังก์ชันเดียวกันทั้งโหมด mock และ API จริง — สลับด้วย NEXT_PUBLIC_USE_MOCK (docs/03-architecture.md §3.3)
// action ที่เปลี่ยนเงิน/state รับ Idempotency-Key จาก hook (หนึ่ง key ต่อการกดหนึ่งครั้ง — lib/api/idempotency.ts)
import { env } from "@/config/env";
import { api } from "@/lib/api/client";
import { idemHeaders } from "@/lib/api/idempotency";
import { DEMO_PROPERTY, DEMO_TRANSFER } from "@/mocks/fixtures";
import { mockApi } from "@/mocks/handlers";
import type {
  CreateDealInput,
  DealDTO,
  HomeDTO,
  InviteSentDTO,
  MeDTO,
  PayeeDTO,
  PropertyDTO,
  TransferPrecheckDTO,
  TransferResultDTO,
} from "@/types/api";

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const getMe = (): Promise<MeDTO> => (env.useMock ? mockApi.getMe() : data(api.get<MeDTO>("/me")));

export const getHome = (): Promise<HomeDTO> => (env.useMock ? mockApi.getHome() : data(api.get<HomeDTO>("/home")));

export const getDeal = (id: string): Promise<DealDTO> =>
  env.useMock ? mockApi.getDeal(id) : data(api.get<DealDTO>(`/deals/${id}`));

export const getInvite = (code: string): Promise<DealDTO> =>
  env.useMock ? mockApi.getInvite(code) : data(api.get<DealDTO>(`/invites/${encodeURIComponent(code)}`));

export const getProperties = (): Promise<PropertyDTO[]> =>
  env.useMock
    ? Promise.resolve([DEMO_PROPERTY])
    : api.get<{ items: PropertyDTO[] }>("/properties").then((r) => r.data.items);

export const createDeal = (input: CreateDealInput, key: string): Promise<DealDTO> =>
  env.useMock ? mockApi.createDeal(input) : data(api.post<DealDTO>("/deals", input, idemHeaders(key)));

export const sendInvite = (id: string, key: string): Promise<InviteSentDTO> =>
  env.useMock
    ? mockApi.sendInvite(id)
    : data(api.post<InviteSentDTO>(`/deals/${id}/invite/send`, { channel: "IN_APP" }, idemHeaders(key)));

export const rejectDeal = (deal: DealDTO, key: string): Promise<DealDTO> =>
  env.useMock
    ? mockApi.rejectDeal(deal.id)
    : data(api.post<DealDTO>(`/deals/${deal.id}/reject`, { version: deal.version }, idemHeaders(key)));

export const lockDeal = (deal: DealDTO, key: string, method: "FACE_ID" | "PIN" = "FACE_ID"): Promise<DealDTO> =>
  env.useMock
    ? mockApi.lockDeal(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/lock`,
          { version: deal.version, inviteCode: deal.shareCode, method },
          idemHeaders(key),
        ),
      );

export const confirmViewing = (deal: DealDTO, key: string): Promise<DealDTO> =>
  env.useMock
    ? mockApi.confirmViewing(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/confirm-viewing`,
          { version: deal.version, checklist: ["VIEWED_ROOM", "ROOM_MATCHES", "LANDLORD_MATCHES"] },
          idemHeaders(key),
        ),
      );

export const confirmMoveIn = (deal: DealDTO, key: string): Promise<DealDTO> =>
  env.useMock
    ? mockApi.confirmMoveIn(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/confirm-move-in`,
          { version: deal.version, checklist: ["GOT_KEYS", "ROOM_USABLE", "CONTRACT_SIGNED"] },
          idemHeaders(key),
        ),
      );

// ---- โอนเงิน (T8) ----

export const getPayees = (): Promise<PayeeDTO[]> =>
  env.useMock
    ? Promise.resolve([DEMO_TRANSFER.payee])
    : api.get<{ items: PayeeDTO[] }>("/transfers/payees").then((r) => r.data.items);

export const precheckTransfer = (toAccountId: string, amountSatang: number): Promise<TransferPrecheckDTO> =>
  env.useMock
    ? mockApi.precheckTransfer(toAccountId)
    : data(api.post<TransferPrecheckDTO>("/transfers/precheck", { toAccountId, amountSatang }));

export type TransferInput = { toAccountId: string; amountSatang: number; memo: string; action: "CONFIRM" | "CANCEL" };

export const createTransfer = (input: TransferInput, key: string): Promise<TransferResultDTO> =>
  env.useMock
    ? Promise.resolve({
        id: "mock-transfer",
        status: input.action === "CONFIRM" ? "COMPLETED_SIMULATED" : "CANCELLED_BY_USER",
        warningShown: true,
      })
    : data(api.post<TransferResultDTO>("/transfers", input, idemHeaders(key)));
