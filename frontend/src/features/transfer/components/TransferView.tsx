"use client";

import { User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { formatBaht } from "@/lib/format/money";
import type { PayeeDTO } from "@/types/api";
import { OffDealWarningSheet } from "./OffDealWarningSheet";

type TransferViewProps = {
  payee: PayeeDTO;
  amountSatang: number;
  memo: string;
  checking?: boolean;
  warning: string | null;
  onBack?: () => void;
  onConfirm?: () => void;
  onCancelTransfer?: () => void;
  onProceed?: () => void;
};

/** หน้าโอนเงิน + T8 sheet เตือนเมื่อโอนหาคู่ดีลที่ยังไม่จบ (Phase 8 จะเพิ่มเลือกผู้รับ/กรอกยอด) */
export function TransferView({
  payee,
  amountSatang,
  memo,
  checking,
  warning,
  onBack,
  onConfirm,
  onCancelTransfer,
  onProceed,
}: TransferViewProps) {
  return (
    <>
      <AppShell
        background={<ScreenBackground screen="T8" />}
        header={<AppHeader title="โอนเงิน" left="back" right="menu" onLeft={onBack} />}
        footer={
          <StickyFooter>
            <Button loading={checking} onClick={onConfirm}>
              ยืนยันการโอน
            </Button>
          </StickyFooter>
        }
        className="flex flex-col gap-3 px-5 pt-1 pb-2"
      >
        <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
          <span className="text-caption text-muted">โอนไปยัง</span>
          <div className="flex items-center gap-3">
            <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
              <User size={18} strokeWidth={1.5} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-header">{payee.displayName}</span>
              <span className="text-caption text-muted">
                {payee.bankName} · {payee.accountNoMasked}
              </span>
            </div>
          </div>
          <hr className="border-line" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted">จำนวนเงิน</span>
            <span className="text-amount-lg tabular-nums">{formatBaht(amountSatang, 2)}</span>
          </div>
          <div className="flex justify-between gap-3 text-meta">
            <span className="text-muted">บันทึกช่วยจำ</span>
            <span className="font-medium">{memo}</span>
          </div>
        </section>
      </AppShell>

      <OffDealWarningSheet
        open={warning !== null}
        message={warning ?? ""}
        onCancelTransfer={onCancelTransfer}
        onProceed={onProceed}
      />
    </>
  );
}
