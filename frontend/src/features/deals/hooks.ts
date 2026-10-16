"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/Toast";
import { env } from "@/config/env";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { idempotencyKey, releaseIdempotencyKey } from "@/lib/api/idempotency";
import type { CreateDealInput, DealDTO, DealState } from "@/types/api";
import * as dealsApi from "./api";

export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  deal: (id: string) => ["deal", id] as const,
  invite: (code: string) => ["invite", code] as const,
  properties: ["properties"] as const,
  payees: ["payees"] as const,
};

// Polling (docs/05-api.md §5) — เฉพาะ API จริง (mock เปลี่ยนได้จากเครื่องนี้เครื่องเดียว)
const FINISHED: DealState[] = ["RELEASED", "REJECTED", "EXPIRED", "REFUNDED"];
const poll = (ms: number) => (env.useMock ? false : ms);

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: dealsApi.getMe, refetchInterval: poll(10_000) });
export const useHome = () =>
  useQuery({ queryKey: queryKeys.home, queryFn: dealsApi.getHome, refetchInterval: poll(5_000) });
/** L5 / D8: อัปเดตเองทุก NEXT_PUBLIC_POLL_MS จนดีลจบ */
export const useDeal = (id: string) =>
  useQuery({
    queryKey: queryKeys.deal(id),
    queryFn: () => dealsApi.getDeal(id),
    refetchInterval: (q) => (q.state.data && FINISHED.includes(q.state.data.state) ? false : poll(env.pollMs)),
  });
export const useInvite = (code: string) =>
  useQuery({ queryKey: queryKeys.invite(code), queryFn: () => dealsApi.getInvite(code), retry: false });
/** ห้องแรกของผู้ให้เช่า (เดโมมีห้องเดียว) */
export const useProperty = () =>
  useQuery({ queryKey: queryKeys.properties, queryFn: dealsApi.getProperties, select: (items) => items[0] });
export const usePayees = () => useQuery({ queryKey: queryKeys.payees, queryFn: dealsApi.getPayees });

const isNetwork = (err: unknown) => err instanceof ApiError && err.isNetwork;

/**
 * action ที่เปลี่ยนเงิน/state — หนึ่งการกดใช้ Idempotency-Key เดียว (scope บอกว่า "การกดเดียวกัน" คืออะไร)
 * - เน็ตหลุด: retry อัตโนมัติ 2 ครั้งด้วย key เดิม · ถ้ายังไม่ได้ ผู้ใช้กดซ้ำก็ยังได้ key เดิม → server ทำแค่ครั้งเดียว
 * - สำเร็จ / server ปฏิเสธ (4xx): ทิ้ง key แล้ว invalidate ทุก query
 *   (route ที่เปิดไว้ยังค้างอยู่ใน <Activity> ของ Cache Components จึงต้องรีเฟรชข้อมูลทุกหน้า)
 */
function useAction<TVars, TData>(scope: (vars: TVars) => string, fn: (vars: TVars, key: string) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(vars, idempotencyKey(scope(vars))),
    retry: (count, err) => isNetwork(err) && count < 2,
    retryDelay: 800,
    onSuccess: (_data, vars) => {
      releaseIdempotencyKey(scope(vars));
      return qc.invalidateQueries();
    },
    onError: (err, vars) => {
      if (!isNetwork(err)) releaseIdempotencyKey(scope(vars));
      toast.error(errorMessage(err));
      // ดีลเปลี่ยนไปแล้ว (อีกเครื่องกดก่อน) → ดึงข้อมูลใหม่ให้หน้าพาไปตาม state ล่าสุด
      if (err instanceof ApiError && err.status === 409) void qc.invalidateQueries();
    },
  });
}

const dealScope = (action: string) => (deal: DealDTO) => `${action}:${deal.id}:v${deal.version}`;

export const useCreateDeal = () =>
  useAction((input: CreateDealInput) => `create-deal:${JSON.stringify(input)}`, dealsApi.createDeal);
export const useSendInvite = () => useAction((id: string) => `send-invite:${id}`, dealsApi.sendInvite);
export const useRejectDeal = () => useAction(dealScope("reject"), dealsApi.rejectDeal);
export const useLockDeal = () => useAction(dealScope("lock"), (deal: DealDTO, key) => dealsApi.lockDeal(deal, key));
export const useConfirmViewing = () => useAction(dealScope("confirm-viewing"), dealsApi.confirmViewing);
export const useConfirmMoveIn = () => useAction(dealScope("confirm-move-in"), dealsApi.confirmMoveIn);
export const useCreateTransfer = () =>
  useAction((t: dealsApi.TransferInput) => `transfer:${JSON.stringify(t)}`, dealsApi.createTransfer);
