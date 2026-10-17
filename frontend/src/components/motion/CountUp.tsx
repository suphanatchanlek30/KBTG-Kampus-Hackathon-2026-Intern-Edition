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
  duration?: number;
  delay?: number;
  className?: string;
};

export function CountUp({ satang, decimals = 2, duration = 1, delay = 0, className }: CountUpProps) {
  const mode = useMotionMode();
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatBaht(satang, decimals);
  const counting = mode === "full";

  useEffect(() => {
    const el = ref.current;
    if (!el || !counting) return;
    el.textContent = formatBaht(0, decimals);
    const controls = animate(0, satang, {
      duration,
      delay,
      ease: EASE_OUT_CUBIC,
      onUpdate: (v) => {
        el.textContent = formatBaht(Math.round(v), decimals);
      },
    });
    return () => controls.stop();
  }, [counting, satang, decimals, duration, delay]);

  return (
    <span className={cn("tabular-nums", className)}>
      <span ref={ref} aria-hidden>
        {counting ? formatBaht(0, decimals) : final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
