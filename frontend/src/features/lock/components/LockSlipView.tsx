"use client";

import { ChevronRight, Download } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { CountUp } from "@/components/motion/CountUp";
import { useEnter } from "@/components/motion/MotionMode";
import { SuccessHero } from "@/components/motion/SuccessHero";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { ReceiptCard, type ReceiptField, type ReceiptLine } from "@/features/receipt/components/ReceiptCard";
import { formatDateTime } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO } from "@/types/api";

type LockSlipViewProps = {
  deal: DealDTO;
  onClose?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onViewStatus?: () => void;
};

/** A re-viewable slip of the tenant's fund lock, built from the deal's timeline. */
export function LockSlipView({ deal, onClose, onShare, onSave, onViewStatus }: LockSlipViewProps) {
  const enter = useEnter();
  const { amounts, property, landlord, tenant } = deal;
  const lockedAt = deal.timeline.find((e) => e.type === "FUNDS_LOCKED")?.at;
  const lockedText = lockedAt ? formatDateTime(lockedAt) : "—";

  const lines: ReceiptLine[] = [
    { key: "BOOKING_FEE", title: "ค่าจอง", detail: lockedText, amount: formatBaht(amounts.bookingFeeSatang) },
    { key: "MAIN_DEPOSIT", title: "มัดจำหลัก", detail: lockedText, amount: formatBaht(amounts.mainDepositSatang) },
  ];
  const fields: ReceiptField[] = [
    { label: "จากบัญชี", value: tenant?.accountNoMasked ?? "-" },
    { label: "สำหรับ", value: `${landlord.displayName} (ผู้ให้เช่า)` },
    { label: "ห้อง", value: `${property.projectName} · ${property.unitNo}` },
    { label: "เลขอ้างอิง", value: deal.refNo },
  ];

  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen="T4" hero={{ size: 84, offsetY: -4 }} />}
      header={<AppHeader left="close" right="share" onLeft={onClose} onRight={onShare} />}
      footer={
        <motion.div {...enter(1.1, { y: 16, duration: 0.35 })}>
          <StickyFooter>
            <Button onClick={onSave} iconLeft={<Download size={18} strokeWidth={1.65} />}>
              ดาวน์โหลดสลิป
            </Button>
            <Button
              variant="secondary"
              onClick={onViewStatus}
              iconRight={<ChevronRight size={17} strokeWidth={1.77} />}
            >
              ดูสถานะดีล
            </Button>
          </StickyFooter>
        </motion.div>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      <div className="pt-2 pb-1.5">
        <SuccessHero icon="lock" size={84} />
      </div>
      <motion.h2 className="text-title" {...enter(0.55)}>
        กันเงินเรียบร้อย
      </motion.h2>
      <motion.p className="text-amount-hero text-neon" {...enter(0.65)}>
        <CountUp satang={amounts.totalSatang} delay={0.65} />
      </motion.p>
      <motion.p className="text-meta text-gray" {...enter(0.75)}>
        กันเงินเมื่อ {lockedText}
      </motion.p>

      <ReceiptCard
        header={
          <div className="flex h-[21px] items-center justify-between">
            <Image
              src={brand.logo.src}
              alt={brand.name}
              width={70}
              height={21}
              className="h-[21px] w-[70px]"
              loading="eager"
            />
            <span className="text-micro text-ink-2">สลิปกันเงิน</span>
          </div>
        }
        lines={lines}
        fields={fields}
      />
    </AppShell>
  );
}
