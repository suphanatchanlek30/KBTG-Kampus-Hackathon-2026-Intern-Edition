"use client";

import { CircleCheck, LoaderCircle, Lock, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { useEnter, useMotionMode } from "@/components/motion/MotionMode";
import { SuccessHero } from "@/components/motion/SuccessHero";
import { EASE_OUT_EXPO, SPRING_HERO } from "@/components/motion/tokens";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/format/money";

export type ScanPhase = "scanning" | "success" | "error";

type LockViewProps = {
  amountSatang: number;
  accountType: string;
  accountNoMasked: string;
  phase: ScanPhase;
  /** กำลังเรียก API กันเงิน — spinner โผล่ถ้าเกิน 600ms */
  pending?: boolean;
  onClose?: () => void;
  onUsePin?: () => void;
  onRetry?: () => void;
};

const STATUS: Record<ScanPhase, string> = {
  scanning: "กำลังสแกนใบหน้า…",
  success: "ยืนยันตัวตนสำเร็จ",
  error: "ยืนยันไม่สำเร็จ ลองอีกครั้ง",
};

/**
 * T3 — ยืนยันการกันเงินด้วย Face ID จำลอง
 * ไม่เปิดกล้อง ไม่ใช้ WebAuthn ไม่เก็บข้อมูลใบหน้า — เป็นอนิเมชันล้วน (docs/02-ui-spec.md §5.2)
 */
export function LockView({
  amountSatang,
  accountType,
  accountNoMasked,
  phase,
  pending = false,
  onClose,
  onUsePin,
  onRetry,
}: LockViewProps) {
  const enter = useEnter();
  const mode = useMotionMode();
  const full = mode === "full";
  const scanning = phase === "scanning" && full;

  return (
    <AppShell
      background={<ScreenBackground screen="T3" hero={{ size: 84, ripple: 3.2 }} />}
      header={<AppHeader title="ยืนยันการกันเงิน" left="close" right="menu" onLeft={onClose} />}
      footer={
        <div className="flex h-[60px] items-start justify-center px-5 pt-[18px] framed:pb-0">
          <Button variant="link" className="text-section" onClick={onUsePin}>
            ใช้รหัส PIN แทน
          </Button>
        </div>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      <div className="pt-2 pb-1.5">
        <SuccessHero icon="shield" size={84} />
      </div>

      <motion.div className="flex flex-col items-center" {...enter(0.15)}>
        <h2 className="text-title">ยืนยันการกันเงิน</h2>
        <p className="pt-1 text-body text-gray">ด้วย Face ID</p>
      </motion.div>

      <motion.section
        className="flex w-full flex-col items-center gap-1 rounded-card bg-white p-4 text-center"
        {...enter(0, { y: 24 })}
      >
        <p className="text-caption text-ink-2">ยอดที่จะกันไว้กับ {brand.name}</p>
        <p className="text-amount-hero text-ink-green tabular-nums">{formatBaht(amountSatang, 2)}</p>
        <p className="text-caption text-ink-2">
          จากบัญชี{accountType} {accountNoMasked}
        </p>
        <div className="w-full pt-2">
          <p className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-mint-pale px-2.5 text-caption font-medium text-parsley">
            <Lock size={13} strokeWidth={1.6} />
            เงินยังอยู่ในบัญชีคุณ แต่ใช้จ่ายไม่ได้จนกว่าดีลจะจบ
          </p>
        </div>
      </motion.section>

      <motion.div
        className="pt-3.5"
        {...(full && {
          initial: { scale: 0.9, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.4, ease: EASE_OUT_EXPO },
        })}
      >
        <motion.div
          className={cn(
            "relative flex size-24 items-center justify-center overflow-hidden rounded-[30px] border bg-card transition-colors duration-200",
            phase === "scanning" && "border-neon/35 text-white",
            phase === "success" && "border-neon text-neon",
            phase === "error" && "border-danger text-danger",
          )}
          // ล้มเหลว: เขย่า x 0, −8, 8, −6, 6, 0 ใน 0.4s
          animate={full && phase === "error" ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {scanning && (
            <span
              aria-hidden
              className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-neon/60 motion-safe:animate-scan-line"
            />
          )}
          {/* หน้า ↔ ✓ crossfade + scale 0.6 → 1 spring */}
          <motion.span
            className="absolute"
            initial={false}
            animate={{ opacity: phase === "success" ? 0 : 1 }}
            transition={{ duration: full ? 0.15 : 0 }}
          >
            <ScanFaceGlyph breathing={scanning} />
          </motion.span>
          <motion.span
            className="absolute"
            initial={false}
            animate={phase === "success" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
            transition={full ? SPRING_HERO : { duration: 0 }}
          >
            <CircleCheck size={50} strokeWidth={1.4} />
          </motion.span>
        </motion.div>
      </motion.div>
      <p
        role="status"
        className={cn(
          "flex items-center gap-1.5 text-caption",
          phase === "error" ? "text-danger" : phase === "success" ? "text-neon" : "text-muted",
        )}
      >
        {pending && full && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <LoaderCircle aria-label="กำลังกันเงิน" className="size-3.5 animate-spin" />
          </motion.span>
        )}
        {scanning ? (
          <span>
            กำลังสแกนใบหน้า
            {/* จุด … ขึ้นทีละจุด 0.4s */}
            <span className="inline-block motion-safe:animate-dots">…</span>
          </span>
        ) : (
          STATUS[phase]
        )}
      </p>
      {phase === "error" && (
        <Button variant="secondary" className="w-auto px-6" iconLeft={<RotateCcw size={16} />} onClick={onRetry}>
          ลองอีกครั้ง
        </Button>
      )}
    </AppShell>
  );
}

/** ScanFace (lucide) ที่แยกมุมกรอบออกมา "หายใจ" scale 1 → 0.9 → 1 ระหว่างสแกน */
function ScanFaceGlyph({ breathing }: { breathing: boolean }) {
  return (
    <svg
      aria-hidden
      width={50}
      height={50}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className={cn("origin-center [transform-box:fill-box]", breathing && "motion-safe:animate-scan-corners")}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      </g>
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  );
}
