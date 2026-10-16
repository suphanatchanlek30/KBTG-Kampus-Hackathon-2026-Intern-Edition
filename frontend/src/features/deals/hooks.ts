"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/api/errors";
import type { CreateDealInput, DealDTO } from "@/types/api";
import * as dealsApi from "./api";

export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  deal: (id: string) => ["deal", id] as const,
  invite: (code: string) => ["invite", code] as const,
};

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: dealsApi.getMe });
export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: dealsApi.getHome });
export const useDeal = (id: string) => useQuery({ queryKey: queryKeys.deal(id), queryFn: () => dealsApi.getDeal(id) });
export const useInvite = (code: string) =>
  useQuery({ queryKey: queryKeys.invite(code), queryFn: () => dealsApi.getInvite(code), retry: false });

/**
 * mutation ของดีล — หลังสำเร็จ invalidate ทุก query
 * (route ที่เปิดไว้ยังค้างอยู่ใน <Activity> ของ Cache Components จึงต้องรีเฟรชข้อมูลทุกหน้า)
 */
function useDealMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export const useCreateDeal = () => useDealMutation((input: CreateDealInput) => dealsApi.createDeal(input));
export const useSendInvite = () => useDealMutation((id: string) => dealsApi.sendInvite(id));
export const useRejectDeal = () => useDealMutation((deal: DealDTO) => dealsApi.rejectDeal(deal));
export const useLockDeal = () => useDealMutation((deal: DealDTO) => dealsApi.lockDeal(deal));
export const useConfirmViewing = () => useDealMutation((deal: DealDTO) => dealsApi.confirmViewing(deal));
export const useConfirmMoveIn = () => useDealMutation((deal: DealDTO) => dealsApi.confirmMoveIn(deal));
