"use client";

import { Eye, Key, Lock, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { DrawnCheck } from "@/components/motion/DrawnCheck";
import { useMotionMode } from "@/components/motion/MotionMode";
import { EASE_OUT_EXPO, SPRING_DOT } from "@/components/motion/tokens";
import { cn } from "@/lib/cn";

export type StepStatus = "done" | "current" | "upcoming";
type Statuses = [StepStatus, StepStatus, StepStatus];

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "กันเงิน", icon: Lock },
  { label: "ดูห้อง", icon: Eye },
  { label: "เข้าอยู่", icon: Key },
];

// §5.3: จุด done เด้งเข้า stagger 0.15s + วาดถูก 0.3s · เส้นเชื่อม scaleX 0.5s หลังจุดซ้ายเสร็จ
const DOT_STAGGER = 0.15;

type StepperRowProps = {
  statuses: Statuses;
  tone?: "dark" | "light";
  /** วินาทีที่เริ่มอนิเมชันเข้า (ไม่ระบุ = แสดงเลย) — pulse ring ของขั้นปัจจุบันทำงานเสมอ */
  delay?: number;
};

/**
 * แถว stepper 3 ขั้น (Figma: วงกลม 34 r17 · ป้าย 11px · เส้น 1.5px ที่ y+16)
 * done = เขียวมีถูก · current = ขอบเขียวพื้น neon/12 · upcoming = ขอบ line พื้นดำ
 * tone="light" ใช้บนการ์ดขาว (T7): ป้ายสี ink-2 · เส้นที่ผ่านแล้วสีดำ
 */
export function StepperRow({ statuses, tone = "dark", delay }: StepperRowProps) {
  const light = tone === "light";
  const mode = useMotionMode();
  const full = mode === "full";
  const entering = full && delay !== undefined;
  const dotAt = (i: number) => (delay ?? 0) + i * DOT_STAGGER;

  return (
    <div className="flex" aria-label="ขั้นตอนของดีล">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const status = statuses[i];
        const lineDone = i > 0 && statuses[i - 1] === "done" && status !== "upcoming";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span className="flex-1 pt-4" aria-hidden>
                <motion.span
                  className={cn("block h-[1.5px] origin-left", lineDone ? (light ? "bg-ink" : "bg-neon") : "bg-line")}
                  {...(entering &&
                    lineDone && {
                      initial: { scaleX: 0 },
                      animate: { scaleX: 1 },
                      transition: { duration: 0.5, ease: EASE_OUT_EXPO, delay: dotAt(i - 1) + DOT_STAGGER },
                    })}
                />
              </span>
            )}
            <div
              className="flex w-14 flex-col items-center gap-[5px]"
              aria-current={status === "current" ? "step" : undefined}
            >
              <motion.span
                className={cn(
                  "relative flex size-[34px] items-center justify-center rounded-full border",
                  status === "done" && "border-neon bg-neon text-ink",
                  status === "current" && "border-neon bg-neon/12 text-neon",
                  status === "upcoming" && "border-line bg-ink text-muted",
                )}
                {...(entering &&
                  status === "done" && {
                    initial: { scale: 0 },
                    animate: { scale: 1 },
                    transition: { ...SPRING_DOT, delay: dotAt(i) },
                  })}
              >
                {status === "current" && full && (
                  <span
                    aria-hidden
                    className="absolute -inset-px rounded-full border border-neon motion-safe:animate-pulse-ring"
                  />
                )}
                {status === "done" ? (
                  <DrawnCheck size={16} strokeWidth={2.4} draw={entering} delay={dotAt(i) + 0.1} />
                ) : (
                  <Icon size={15} strokeWidth={1.6} />
                )}
              </motion.span>
              <span
                className={cn(
                  "text-micro",
                  status === "done" && (light ? "text-ink-2" : "text-gray"),
                  status === "current" && "font-semibold text-neon",
                  status === "upcoming" && "text-muted",
                )}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Stepper ในการ์ดมืด T4/T6 (Figma: การ์ด r20 pad 16 gap 10) — children = เนื้อหาใต้ stepper (T6) */
export function Stepper3({ statuses, delay, children }: { statuses: Statuses; delay?: number; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
      <StepperRow statuses={statuses} delay={delay} />
      {children}
    </section>
  );
}
