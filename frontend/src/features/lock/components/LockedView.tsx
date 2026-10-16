"use client";

import { Calendar, ChevronRight, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { HeroCircle } from "@/components/ui/HeroCircle";
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

/** T4 — กันเงินเรียบร้อย */
export function LockedView({ deal, account, onClose, onShare, onViewStatus, onHome }: LockedViewProps) {
  return (
    <AppShell
      background={<ScreenBackground screen="T4" />}
      header={<AppHeader left="close" right="share" onLeft={onClose} onRight={onShare} />}
      footer={
        <StickyFooter>
          <Button onClick={onViewStatus} iconRight={<ChevronRight size={17} strokeWidth={1.77} />}>
            ดูสถานะดีล
          </Button>
          <Button variant="secondary" onClick={onHome}>
            กลับหน้าหลัก
          </Button>
        </StickyFooter>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      <div className="pt-2 pb-1.5">
        <HeroCircle size={84}>
          <Lock size={36} strokeWidth={2.4} />
        </HeroCircle>
      </div>
      <h2 className="text-title">กันเงินเรียบร้อย</h2>
      <p className="text-amount-hero text-neon tabular-nums">{formatBaht(deal.amounts.totalSatang, 2)}</p>
      <p className="text-meta text-gray">เงินยังเป็นของคุณ จนกว่าจะได้เข้าอยู่จริง</p>

      <div className="w-full">
        <Stepper3 statuses={["done", "current", "upcoming"]} />
      </div>

      <section className="flex w-full items-center gap-2.5 rounded-card bg-card p-4">
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
      </section>

      <section className="flex w-full flex-col gap-1.5 rounded-card bg-card p-4 text-meta">
        <div className="flex justify-between gap-3">
          <span className="text-muted">ยอดที่ใช้ได้ตอนนี้</span>
          <span className="font-medium tabular-nums">{formatBaht(account.availableSatang, 2)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">กันไว้กับ {brand.name}</span>
          <span className="font-medium tabular-nums">{formatBaht(account.heldSatang, 2)}</span>
        </div>
      </section>
    </AppShell>
  );
}
