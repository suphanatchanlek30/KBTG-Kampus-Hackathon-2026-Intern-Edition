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
  notifications: ["notifications"] as const,
};

const FINISHED: DealState[] = ["RELEASED", "REJECTED", "EXPIRED", "REFUNDED"];
const poll = (ms: number) => (env.useMock ? false : ms);

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: dealsApi.getMe, refetchInterval: poll(10_000) });
export const useHome = () =>
  useQuery({ queryKey: queryKeys.home, queryFn: dealsApi.getHome, refetchInterval: poll(5_000) });
export const useDeal = (id: string) =>
  useQuery({
    queryKey: queryKeys.deal(id),
    queryFn: () => dealsApi.getDeal(id),
    refetchInterval: (q) => (q.state.data && FINISHED.includes(q.state.data.state) ? false : poll(env.pollMs)),
  });
export const useInvite = (code: string) =>
  useQuery({ queryKey: queryKeys.invite(code), queryFn: () => dealsApi.getInvite(code), retry: false });
export const useProperty = () =>
  useQuery({ queryKey: queryKeys.properties, queryFn: dealsApi.getProperties, select: (items) => items[0] });
export const usePayees = () => useQuery({ queryKey: queryKeys.payees, queryFn: dealsApi.getPayees });

const isNetwork = (err: unknown) => err instanceof ApiError && err.isNetwork;

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
      if (err instanceof ApiError && err.status === 409) void qc.invalidateQueries();
    },
  });
}

const dealScope = (action: string) => (deal: DealDTO) => `${action}:${deal.id}:v${deal.version}`;

export const useCreateDeal = () =>
  useAction((input: CreateDealInput) => `create-deal:${JSON.stringify(input)}`, dealsApi.createDeal);
export const useSendInvite = () =>
  useAction((v: dealsApi.SendInviteInput) => `send-invite:${v.id}:${v.phone ?? "app"}`, dealsApi.sendInvite);
export const useRejectDeal = () => useAction(dealScope("reject"), dealsApi.rejectDeal);
export const useLockDeal = () =>
  useAction(
    (v: { deal: DealDTO; method: "FACE_ID" | "PIN" }) => `lock:${v.deal.id}:v${v.deal.version}`,
    (v, key) => dealsApi.lockDeal(v.deal, key, v.method),
  );
export const useConfirmViewing = () => useAction(dealScope("confirm-viewing"), dealsApi.confirmViewing);
export const useConfirmMoveIn = () => useAction(dealScope("confirm-move-in"), dealsApi.confirmMoveIn);
export const useCancelDeal = () => useAction(dealScope("cancel"), dealsApi.cancelDeal);
export const useReportIssue = () => useAction(dealScope("report-issue"), dealsApi.reportIssue);

export const useExpireNow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dealsApi.expireNow,
    onSuccess: () => qc.invalidateQueries(),
    onError: (err) => toast.error(errorMessage(err)),
  });
};

export const useNotifications = () =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: dealsApi.getNotifications, refetchInterval: poll(10_000) });
export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: dealsApi.markAllNotificationsRead, onSuccess: () => qc.invalidateQueries() });
};

export const useCreateTransfer = () =>
  useAction((t: dealsApi.TransferInput) => `transfer:${JSON.stringify(t)}`, dealsApi.createTransfer);
