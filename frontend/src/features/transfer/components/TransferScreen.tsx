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

/**
 * /transfer — โอนเงิน + T8 เตือนเมื่อโอนหาคู่ดีลที่ยังไม่จบ
 * เดโมใช้ยอด/บันทึกตามสคริปต์ (3,000 "ค่าส่วนกลางล่วงหน้า") หาผู้รับคนแรก = ผู้ให้เช่า · Phase 8 จะให้เลือกผู้รับ/กรอกยอดเอง
 */
export function TransferScreen() {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const { data: payees } = usePayees();
  const transfer = useCreateTransfer();
  const { amountSatang, memo } = DEMO_TRANSFER;
  const payee = payees?.[0];

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

  // บันทึกทั้งโอนจริงและยกเลิก — server นับว่าผู้ใช้ยกเลิกหลังเห็นคำเตือนกี่ครั้ง (docs/05-api.md #26)
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
      checking={precheck.isPending || transfer.isPending}
      warning={warning}
      onBack={() => router.back()}
      onConfirm={() => precheck.mutate()}
      onCancelTransfer={() => send("CANCEL")}
      onProceed={() => send("CONFIRM")}
    />
  );
}
