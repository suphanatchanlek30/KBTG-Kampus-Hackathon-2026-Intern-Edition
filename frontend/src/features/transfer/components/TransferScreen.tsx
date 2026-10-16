"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import { precheckTransfer } from "@/features/deals/api";
import { errorMessage } from "@/lib/api/errors";
import { DEMO_TRANSFER } from "@/mocks/fixtures";
import { TransferView } from "./TransferView";

/** /transfer — โอนเงิน + T8 (Phase 8: GET /transfers/payees, POST /transfers) */
export function TransferScreen() {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const { payee, amountSatang, memo } = DEMO_TRANSFER;

  const precheck = useMutation({
    mutationFn: () => precheckTransfer(payee.accountId, amountSatang),
    onSuccess: (res) => {
      if (res.warning) {
        navigator.vibrate?.([30, 60, 30]);
        setWarning(res.warning.message);
      } else {
        toast.success("โอนเงินสำเร็จ (จำลอง)");
        router.replace("/home");
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <TransferView
      payee={payee}
      amountSatang={amountSatang}
      memo={memo}
      checking={precheck.isPending}
      warning={warning}
      onBack={() => router.back()}
      onConfirm={() => precheck.mutate()}
      onCancelTransfer={() => {
        setWarning(null);
        toast.success("ยกเลิกการโอนแล้ว — เงินของคุณยังปลอดภัย");
        router.replace("/home");
      }}
      onProceed={() => {
        setWarning(null);
        toast.success("โอนเงินสำเร็จ (จำลอง)");
        router.replace("/home");
      }}
    />
  );
}
