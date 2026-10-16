"use client";

import { Clock, RotateCcw, X, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { useEnter } from "@/components/motion/MotionMode";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { formatBaht } from "@/lib/format/money";
import { cn } from "@/lib/cn";
import type { DealDTO } from "@/types/api";

type Outcome = { icon: LucideIcon; tone: "muted" | "warn"; title: string; body: string };

/** ข้อความตามวิธีที่ดีลจบ — ดูจากไทม์ไลน์ (ยกเลิก vs หมดอายุ) */
function outcome(deal: DealDTO): Outcome {
  const tenant = deal.myRole === "TENANT";
  const refunded = deal.amounts.refundedSatang;
  const cancelled = deal.timeline.some((e) => e.type === "DEAL_CANCELLED");
  if (deal.state === "REJECTED")
    return {
      icon: X,
      tone: "muted",
      title: tenant ? "คุณปฏิเสธดีลนี้แล้ว" : "ผู้เช่าปฏิเสธดีล",
      body: "ไม่มีเงินถูกกัน · ดีลนี้จบแล้ว",
    };
  if (cancelled)
    return {
      icon: RotateCcw,
      tone: "warn",
      title: "ยกเลิกดีลแล้ว",
      body:
        refunded > 0
          ? `ทั้งสองฝ่ายยินยอม · คืนเงินที่ยังกันไว้ ${formatBaht(refunded, 2)} ให้ผู้เช่าแล้ว`
          : "ทั้งสองฝ่ายยินยอมยกเลิกแล้ว",
    };
  return {
    icon: Clock,
    tone: "warn",
    title: refunded > 0 ? "ดีลหมดอายุ · คืนเงินอัตโนมัติ" : "คำขอหมดอายุ",
    body:
      refunded > 0
        ? `เลยวันหมดอายุแล้ว · คืนเงินที่ยังกันไว้ ${formatBaht(refunded, 2)} ให้ผู้เช่าอัตโนมัติ`
        : "ผู้เช่าไม่ได้ตอบคำขอภายในเวลา · ไม่มีเงินถูกกัน",
  };
}

/** D3 — ดีลจบแบบไม่สำเร็จ (⚠️ รออนุมัติดีไซน์ — layout L6/T7 แต่วงกลมสี muted/warn) */
export function ResultView({ deal, onHome }: { deal: DealDTO; onHome?: () => void }) {
  const enter = useEnter();
  const { icon: Icon, tone, title, body } = outcome(deal);
  const released = deal.amounts.releasedSatang;

  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen="L6" />}
      header={<AppHeader left="close" onLeft={onHome} />}
      footer={
        <StickyFooter>
          <Button onClick={onHome}>กลับหน้าหลัก</Button>
        </StickyFooter>
      }
      className="flex flex-col items-center gap-4 px-5 pt-6 pb-2 text-center"
    >
      <motion.div
        className={cn(
          "flex size-24 items-center justify-center rounded-full",
          tone === "warn" ? "bg-warn/15 text-warn" : "bg-card2 text-muted",
        )}
        {...enter(0)}
      >
        <Icon size={40} strokeWidth={1.6} />
      </motion.div>
      <motion.div className="flex flex-col gap-1.5" {...enter(0.1)}>
        <h1 className="text-title">{title}</h1>
        <p className="text-body text-gray">{body}</p>
      </motion.div>

      <motion.section className="flex w-full flex-col gap-2.5 rounded-card bg-card p-4 text-left" {...enter(0.2)}>
        <Row label="ห้อง" value={`${deal.property.projectName} · ${deal.property.unitNo}`} />
        <Row label="เลขอ้างอิง" value={deal.refNo} />
        <Row label="ยอดดีล" value={formatBaht(deal.amounts.totalSatang, 2)} />
        {released > 0 && <Row label="ปล่อยแล้ว (ไม่คืน)" value={formatBaht(released, 2)} />}
        {deal.amounts.refundedSatang > 0 && (
          <Row label="คืนผู้เช่า" value={formatBaht(deal.amounts.refundedSatang, 2)} highlight />
        )}
      </motion.section>
    </AppShell>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-body">
      <span className="text-muted">{label}</span>
      <span className={cn("truncate tabular-nums", highlight && "font-semibold text-neon")}>{value}</span>
    </div>
  );
}
