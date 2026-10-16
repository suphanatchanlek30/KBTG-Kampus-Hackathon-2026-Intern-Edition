"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/format/money";
import { useMotionMode } from "./MotionMode";
import { EASE_OUT_CUBIC } from "./tokens";

type CountUpProps = {
  satang: number;
  decimals?: 0 | 2;
  /** วินาที */
  duration?: number;
  delay?: number;
  className?: string;
};

/**
 * ยอดเงินนับขึ้นจาก 0 (§5.1 · 1.0s ease-out cubic) — เขียนลง textContent ตรงๆ ไม่ re-render ทุกเฟรม
 * reduced/static แสดงค่าสุดท้ายทันที · screen reader อ่านค่าสุดท้ายเสมอ
 */
export function CountUp({ satang, decimals = 2, duration = 1, delay = 0, className }: CountUpProps) {
  const mode = useMotionMode();
  const ref = useRef<HTMLSpanElement>(null);
  // Activity ซ่อนแล้วแสดงหน้าเดิม (back/forward) effect จะรันใหม่ — นับครั้งเดียวต่อ mount เหมือนอนิเมชันอื่น
  const played = useRef(false);
  const final = formatBaht(satang, decimals);
  const counting = mode === "full";

  useEffect(() => {
    const el = ref.current;
    if (!el || !counting) return;
    if (played.current) {
      el.textContent = final;
      return;
    }
    const controls = animate(0, satang, {
      duration,
      delay,
      ease: EASE_OUT_CUBIC,
      onUpdate: (v) => {
        el.textContent = formatBaht(Math.round(v), decimals);
      },
      onComplete: () => {
        played.current = true;
      },
    });
    // ไม่ตั้ง played ใน cleanup — StrictMode รัน effect 2 รอบตอน dev แล้วจะไม่ได้นับเลย
    return () => controls.stop();
  }, [counting, satang, decimals, duration, delay, final]);

  return (
    <span className={cn("tabular-nums", className)}>
      <span ref={ref} aria-hidden>
        {counting ? formatBaht(0, decimals) : final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
