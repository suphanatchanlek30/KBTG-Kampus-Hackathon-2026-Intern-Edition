"use client";

import { Ban, Check, Clock, Plus, RotateCcw, Undo2, X, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { useEnter, useMotionMode } from "@/components/motion/MotionMode";
import { SPRING_CARD } from "@/components/motion/tokens";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO, TrancheStatus } from "@/types/api";

type Tone = "warn" | "muted";
type Outcome = { icon: LucideIcon; tone: Tone; title: string; subtitle: string };

function outcome(deal: DealDTO): Outcome {
  const tenant = deal.myRole === "TENANT";
  const refunded = deal.amounts.refundedSatang > 0;
  if (deal.state === "REJECTED")
    return {
      icon: X,
      tone: "muted",
      title: tenant ? "คุณปฏิเสธดีลนี้แล้ว" : "ผู้เช่าปฏิเสธดีล",
      subtitle: "ไม่มีเงินถูกกัน · ดีลนี้ปิดแล้ว",
    };
  if (deal.timeline.some((e) => e.type === "DEAL_CANCELLED"))
    return {
      icon: RotateCcw,
      tone: "warn",
      title: "ยกเลิกดีลแล้ว",
      subtitle: refunded ? "ทั้งสองฝ่ายยินยอม · คืนเงินที่ยังกันไว้ให้ผู้เช่าแล้ว" : "ทั้งสองฝ่ายยินยอมยกเลิก",
    };
  return refunded
    ? {
        icon: Clock,
        tone: "warn",
        title: "ดีลหมดอายุ · คืนเงินอัตโนมัติ",
        subtitle: "เลยวันหมดอายุ ระบบคืนเงินที่ยังกันไว้ให้ผู้เช่าแล้ว",
      }
    : {
        icon: Clock,
        tone: "warn",
        title: "คำขอหมดอายุ",
        subtitle: "ผู้เช่าไม่ได้ตอบภายในเวลา · ไม่มีเงินถูกกัน",
      };
}

const TRANCHE: Record<TrancheStatus, { label: string; icon: LucideIcon; className: string }> = {
  RELEASED: { label: "ปล่อยแล้ว", icon: Check, className: "bg-neon text-ink" },
  REFUNDED: { label: "คืนผู้เช่าแล้ว", icon: Undo2, className: "bg-warn text-ink" },
  PENDING: { label: "ไม่ได้กัน", icon: Ban, className: "bg-divider-light text-ink-2" },
  HELD: { label: "ยังกันไว้", icon: Clock, className: "bg-divider-light text-ink-2" },
};

export function ResultView({
  deal,
  onHome,
  onNewDeal,
}: {
  deal: DealDTO;
  onHome?: () => void;
  onNewDeal?: () => void;
}) {
  const enter = useEnter();
  const { icon: Icon, tone, title, subtitle } = outcome(deal);
  const { amounts } = deal;
  const endedAt = deal.timeline.at(-1)?.at;

  return (
    <AppShell
      enter="modal"
      background={<ResultBackground tone={tone} />}
      header={<AppHeader left="close" onLeft={onHome} />}
      footer={
        <motion.div {...enter(0.5, { y: 16, duration: 0.35 })}>
          <StickyFooter>
            <Button onClick={onHome}>กลับหน้าหลัก</Button>
            {onNewDeal && (
              <Button variant="secondary" onClick={onNewDeal} iconLeft={<Plus size={18} strokeWidth={1.65} />}>
                สร้างคำขอใหม่
              </Button>
            )}
          </StickyFooter>
        </motion.div>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2 text-center"
    >
      <div className="pt-2 pb-1.5">
        <ResultHero icon={Icon} tone={tone} />
      </div>
      <motion.h2 className="text-title" {...enter(0.2)}>
        {title}
      </motion.h2>
      {amounts.refundedSatang > 0 && (
        <motion.div className="flex flex-col items-center" {...enter(0.28)}>
          <span className="text-caption text-muted">คืนผู้เช่า</span>
          <span className="text-amount-hero text-white tabular-nums">{formatBaht(amounts.refundedSatang, 2)}</span>
        </motion.div>
      )}
      <motion.p className="max-w-[300px] text-meta text-gray" {...enter(0.34)}>
        {subtitle}
      </motion.p>

      <motion.section
        className="mt-2 flex w-full flex-col gap-2.5 rounded-card bg-white p-4 text-left text-ink"
        {...enter(0.42, { y: 32, spring: SPRING_CARD })}
      >
        <div className="flex h-[21px] items-center justify-between">
          <Image src={brand.logo.src} alt={brand.name} width={70} height={21} className="h-[21px] w-[70px]" />
          <span className="text-micro text-ink-2">สรุปดีล</span>
        </div>
        {deal.tranches.map((t) => {
          const s = TRANCHE[t.status];
          return (
            <div key={t.key} className="flex h-9 items-center gap-2.5">
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", s.className)}>
                <s.icon size={13} strokeWidth={2.2} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-row-title">{t.key === "BOOKING_FEE" ? "ค่าจอง" : "มัดจำหลัก"}</span>
                <span className="text-micro text-ink-2">{s.label}</span>
              </div>
              <span className={cn("text-row-title tabular-nums", t.status !== "RELEASED" && "text-ink-2")}>
                {formatBaht(t.amountSatang)}
              </span>
            </div>
          );
        })}
        <hr className="border-divider-light" />
        <dl className="flex flex-col gap-2.5 text-meta">
          <Field label="ห้อง" value={`${deal.property.projectName} · ${deal.property.unitNo}`} />
          <Field label="เลขอ้างอิง" value={deal.refNo} />
          {endedAt && <Field label="ปิดดีลเมื่อ" value={formatDateTime(endedAt)} />}
        </dl>
      </motion.section>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[19px] items-center justify-between gap-3">
      <dt className="shrink-0 text-ink-2">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}

const TONE = {
  warn: { ring: "border-warn/20", fill: "bg-warn/15 border-warn/40 text-warn", glow: "bg-warn/15" },
  muted: { ring: "border-white/10", fill: "bg-card2 border-stroke text-gray", glow: "bg-white/6" },
} as const;

function ResultHero({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const full = useMotionMode() === "full";
  const t = TONE[tone];
  return (
    <motion.div
      className={cn("relative flex size-[92px] items-center justify-center rounded-full border", t.fill)}
      {...(full && {
        initial: { scale: 0.7, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring", stiffness: 260, damping: 20 },
      })}
    >
      <Icon size={38} strokeWidth={1.7} />
    </motion.div>
  );
}

function ResultBackground({ tone }: { tone: Tone }) {
  const t = TONE[tone];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-[420px] justify-center">
      <div className={cn("absolute top-[40px] size-[300px] rounded-full blur-3xl", t.glow)} />
      {[180, 280, 380].map((size) => (
        <div
          key={size}
          className={cn("absolute rounded-full border", t.ring)}
          style={{ width: size, height: size, top: 154 - size / 2 }}
        />
      ))}
    </div>
  );
}
