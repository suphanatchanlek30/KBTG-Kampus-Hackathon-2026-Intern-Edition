// export ฟังก์ชันเดียวกันทั้งโหมด mock และ API จริง — สลับด้วย NEXT_PUBLIC_USE_MOCK (docs/03-architecture.md §3.3)
import { env } from "@/config/env";
import { api } from "@/lib/api/client";
import { mockApi } from "@/mocks/handlers";
import type { CreateDealInput, DealDTO, HomeDTO, InviteSentDTO, MeDTO, TransferPrecheckDTO } from "@/types/api";

const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const getMe = (): Promise<MeDTO> => (env.useMock ? mockApi.getMe() : data(api.get<MeDTO>("/me")));

export const getHome = (): Promise<HomeDTO> => (env.useMock ? mockApi.getHome() : data(api.get<HomeDTO>("/home")));

export const getDeal = (id: string): Promise<DealDTO> =>
  env.useMock ? mockApi.getDeal(id) : data(api.get<DealDTO>(`/deals/${id}`));

export const getInvite = (code: string): Promise<DealDTO> =>
  env.useMock ? mockApi.getInvite(code) : data(api.get<DealDTO>(`/invites/${encodeURIComponent(code)}`));

export const createDeal = (input: CreateDealInput): Promise<DealDTO> =>
  env.useMock ? mockApi.createDeal(input) : data(api.post<DealDTO>("/deals", input, idem()));

export const sendInvite = (id: string): Promise<InviteSentDTO> =>
  env.useMock
    ? mockApi.sendInvite(id)
    : data(api.post<InviteSentDTO>(`/deals/${id}/invite/send`, { channel: "IN_APP" }, idem()));

export const rejectDeal = (deal: DealDTO): Promise<DealDTO> =>
  env.useMock
    ? mockApi.rejectDeal(deal.id)
    : data(api.post<DealDTO>(`/deals/${deal.id}/reject`, { version: deal.version }, idem()));

export const lockDeal = (deal: DealDTO, method: "FACE_ID" | "PIN" = "FACE_ID"): Promise<DealDTO> =>
  env.useMock
    ? mockApi.lockDeal(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/lock`,
          { version: deal.version, inviteCode: deal.shareCode, method },
          idem(),
        ),
      );

export const confirmViewing = (deal: DealDTO): Promise<DealDTO> =>
  env.useMock
    ? mockApi.confirmViewing(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/confirm-viewing`,
          { version: deal.version, checklist: ["VIEWED_ROOM", "ROOM_MATCHES", "LANDLORD_MATCHES"] },
          idem(),
        ),
      );

export const confirmMoveIn = (deal: DealDTO): Promise<DealDTO> =>
  env.useMock
    ? mockApi.confirmMoveIn(deal.id)
    : data(
        api.post<DealDTO>(
          `/deals/${deal.id}/confirm-move-in`,
          { version: deal.version, checklist: ["GOT_KEYS", "ROOM_USABLE", "CONTRACT_SIGNED"] },
          idem(),
        ),
      );

export const precheckTransfer = (toAccountId: string, amountSatang: number): Promise<TransferPrecheckDTO> =>
  env.useMock
    ? mockApi.precheckTransfer(toAccountId)
    : data(api.post<TransferPrecheckDTO>("/transfers/precheck", { toAccountId, amountSatang }));
