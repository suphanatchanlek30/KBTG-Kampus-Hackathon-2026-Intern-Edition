"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { precheckTransfer } from "@/features/deals/api";
import { useCreateTransfer, usePayees } from "@/features/deals/hooks";
import { errorMessage } from "@/lib/api/errors";
import { DEMO_TRANSFER } from "@/mocks/fixtures";
import { TransferView } from "./TransferView";

export function TransferScreen() {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const { data: payees } = usePayees();
  const transfer = useCreateTransfer();
  const [amountSatang, setAmount] = useState<number>(DEMO_TRANSFER.amountSatang);
  const [memo, setMemo] = useState<string>(DEMO_TRANSFER.memo);
  const [picked, setPicked] = useState<string | null>(null);
  const payee = payees?.find((p) => p.accountId === picked) ?? payees?.[0];

  const precheck = useMutation({
    mutationFn: () => precheckTransfer(payee!.accountId, amountSatang),
    onSuccess: (res) => {
      if (res.warning) {
        navigator.vibrate?.([30, 60, 30]);
        setWarning(res.warning.message);
      } else {
        send("CONFIRM");
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!payee) return <ScreenSkeleton />;

  function send(action: "CONFIRM" | "CANCEL") {
    transfer.mutate(
      { toAccountId: payee!.accountId, amountSatang, memo, action },
      {
        onSuccess: () => {
          setWarning(null);
          toast.success(action === "CONFIRM" ? "โอนเงินสำเร็จ (จำลอง)" : "ยกเลิกการโอนแล้ว — เงินของคุณยังปลอดภัย");
          router.replace("/home");
        },
      },
    );
  }

  return (
    <TransferView
      payee={payee}
      amountSatang={amountSatang}
      memo={memo}
      payees={payees}
      onPayeeChange={(p) => setPicked(p.accountId)}
      onAmountChange={setAmount}
      onMemoChange={setMemo}
      checking={precheck.isPending || transfer.isPending}
      warning={warning}
      onBack={() => router.back()}
      onConfirm={() => precheck.mutate()}
      onCancelTransfer={() => send("CANCEL")}
      onProceed={() => send("CONFIRM")}
    />
  );
}
