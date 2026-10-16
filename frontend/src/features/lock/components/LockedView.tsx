"use client";

import { Calendar, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { CountUp } from "@/components/motion/CountUp";
import { useEnter } from "@/components/motion/MotionMode";
import { SuccessHero } from "@/components/motion/SuccessHero";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { Stepper3 } from "@/components/ui/Stepper3";
import { brand } from "@/config/brand";
import { formatTimeNa, formatWeekdayDate } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { AccountDTO, DealDTO } from "@/types/api";

type LockedViewProps = {
  deal: DealDTO;
  account: AccountDTO;
  onClose?: () => void;
  onShare?: () => void;
  onViewStatus?: () => void;
  onHome?: () => void;
};

/** T4 — กันเงินเรียบร้อย (อนิเมชัน §5.1 แบบ T4: ห่วงกุญแจล็อกลง · stepper เริ่ม 0.9s) */
export function LockedView({ deal, account, onClose, onShare, onViewStatus, onHome }: LockedViewProps) {
  const enter = useEnter();
  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen="T4" hero={{ size: 84 }} />}
      header={<AppHeader left="close" right="share" onLeft={onClose} onRight={onShare} />}
      footer={
        <motion.div {...enter(1.2, { y: 16, duration: 0.35 })}>
          <StickyFooter>
            <Button onClick={onViewStatus} iconRight={<ChevronRight size={17} strokeWidth={1.77} />}>
              ดูสถานะดีล
            </Button>
            <Button variant="secondary" onClick={onHome}>
              กลับหน้าหลัก
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
        <CountUp satang={deal.amounts.totalSatang} delay={0.65} />
      </motion.p>
      <motion.p className="text-meta text-gray" {...enter(0.75)}>
        เงินยังเป็นของคุณ จนกว่าจะได้เข้าอยู่จริง
      </motion.p>

      <motion.div className="w-full" {...enter(0.85)}>
        <Stepper3 statuses={["done", "current", "upcoming"]} delay={0.9} />
      </motion.div>

      <motion.section className="flex w-full items-center gap-2.5 rounded-card bg-card p-4" {...enter(1)}>
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
          <Calendar size={18} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-caption text-muted">ขั้นต่อไป</span>
          <span className="pt-[3px] text-body-strong">นัดดูห้อง · {formatWeekdayDate(deal.viewingAt)}</span>
          <span className="truncate text-caption text-muted">
            {formatTimeNa(deal.viewingAt)} · {deal.property.projectName} ({deal.property.nearbyLabel})
          </span>
        </div>
      </motion.section>

      <motion.section className="flex w-full flex-col gap-1.5 rounded-card bg-card p-4 text-meta" {...enter(1.1)}>
        <div className="flex justify-between gap-3">
          <span className="text-muted">ยอดที่ใช้ได้ตอนนี้</span>
          <span className="font-medium tabular-nums">{formatBaht(account.availableSatang, 2)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">กันไว้กับ {brand.name}</span>
          <span className="font-medium tabular-nums">{formatBaht(account.heldSatang, 2)}</span>
        </div>
      </motion.section>
    </AppShell>
  );
}
