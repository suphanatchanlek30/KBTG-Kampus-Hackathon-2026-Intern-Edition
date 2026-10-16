"use client";

import { ChevronRight, User } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { formatBaht } from "@/lib/format/money";
import type { PayeeDTO } from "@/types/api";
import { OffDealWarningSheet } from "./OffDealWarningSheet";

type TransferViewProps = {
  payee: PayeeDTO;
  amountSatang: number;
  memo: string;
  /** เลือกผู้รับอื่นได้ (ไม่ส่ง = แสดงอย่างเดียว เช่น /dev/overlay) */
  payees?: PayeeDTO[];
  onPayeeChange?: (payee: PayeeDTO) => void;
  onAmountChange?: (satang: number) => void;
  onMemoChange?: (memo: string) => void;
  checking?: boolean;
  warning: string | null;
  onBack?: () => void;
  onConfirm?: () => void;
  onCancelTransfer?: () => void;
  onProceed?: () => void;
};

/** หน้าโอนเงิน + T8 sheet เตือนเมื่อโอนหาคู่ดีลที่ยังไม่จบ · เลือกผู้รับ/แก้ยอด/บันทึกช่วยจำได้ */
export function TransferView({
  payee,
  amountSatang,
  memo,
  payees,
  onPayeeChange,
  onAmountChange,
  onMemoChange,
  checking,
  warning,
  onBack,
  onConfirm,
  onCancelTransfer,
  onProceed,
}: TransferViewProps) {
  const [picking, setPicking] = useState(false);
  // เก็บข้อความที่พิมพ์ไว้เอง — พิมพ์ "3000." ระหว่างใส่ทศนิยมได้ (ถ้าแปลงกลับจากสตางค์ทุกครั้ง จุดจะหาย)
  const [amountText, setAmountText] = useState(() => String(amountSatang / 100));
  const canPick = (payees?.length ?? 0) > 1 && onPayeeChange;
  return (
    <>
      <AppShell
        enter="push"
        background={<ScreenBackground screen="T8" />}
        header={<AppHeader title="โอนเงิน" left="back" right="menu" onLeft={onBack} />}
        footer={
          <StickyFooter>
            <Button loading={checking} disabled={amountSatang <= 0} onClick={onConfirm}>
              ยืนยันการโอน
            </Button>
          </StickyFooter>
        }
        className="flex flex-col gap-3 px-5 pt-1 pb-2"
      >
        <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
          <span className="text-caption text-muted">โอนไปยัง</span>
          <button
            type="button"
            disabled={!canPick}
            onClick={() => setPicking(true)}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
              <User size={18} strokeWidth={1.5} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-header">{payee.displayName}</span>
              <span className="text-caption text-muted">
                {payee.bankName} · {payee.accountNoMasked}
              </span>
            </div>
            {canPick && <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />}
          </button>
          <hr className="border-line" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted">จำนวนเงิน</span>
            {onAmountChange ? (
              <input
                inputMode="decimal"
                aria-label="จำนวนเงิน (บาท)"
                value={amountText}
                placeholder="0.00"
                onChange={(e) => {
                  const text = e.target.value.replace(/[^\d.]/g, "").replace(/(\.\d{0,2}).*$/, "$1");
                  setAmountText(text);
                  onAmountChange(Math.min(Math.round((Number(text) || 0) * 100), 100_000_000));
                }}
                className="w-40 bg-transparent text-right text-amount-lg text-white tabular-nums outline-none"
              />
            ) : (
              <span className="text-amount-lg tabular-nums">{formatBaht(amountSatang, 2)}</span>
            )}
          </div>
          <div className="flex justify-between gap-3 text-meta">
            <span className="shrink-0 text-muted">บันทึกช่วยจำ</span>
            {onMemoChange ? (
              <input
                aria-label="บันทึกช่วยจำ"
                value={memo}
                maxLength={100}
                onChange={(e) => onMemoChange(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right font-medium text-white outline-none"
              />
            ) : (
              <span className="font-medium">{memo}</span>
            )}
          </div>
        </section>
      </AppShell>

      <BottomSheet open={picking} onClose={() => setPicking(false)} title="โอนไปยัง">
        <div className="flex flex-col gap-2">
          {payees?.map((p) => (
            <Button
              key={p.accountId}
              variant="secondary"
              onClick={() => {
                onPayeeChange?.(p);
                setPicking(false);
              }}
            >
              {p.displayName} · {p.accountNoMasked}
            </Button>
          ))}
        </div>
      </BottomSheet>

      <OffDealWarningSheet
        open={warning !== null}
        message={warning ?? ""}
        onCancelTransfer={onCancelTransfer}
        onProceed={onProceed}
      />
    </>
  );
}
