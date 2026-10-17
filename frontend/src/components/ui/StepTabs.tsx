"use client";

import { motion } from "motion/react";
import { useMotionMode } from "@/components/motion/MotionMode";
import { EASE_OUT_EXPO } from "@/components/motion/tokens";
import { cn } from "@/lib/cn";

export function StepTabs({ steps, current }: { steps: string[]; current: number }) {
  const full = useMotionMode() === "full";
  return (
    <ol className="flex gap-1.5 px-5 pt-1 pb-3.5">
      {steps.map((label, i) => {
        const reached = i <= current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-[7px]" aria-current={i === current ? "step" : undefined}>
            <span className="relative h-[3px] rounded-[2px] bg-line">
              {reached && (
                <motion.span
                  className="absolute inset-0 origin-left rounded-[2px] bg-neon"
                  initial={full && i === current && i > 0 ? { scaleX: 0 } : false}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.1 }}
                />
              )}
            </span>
            <span
              className={cn(
                "text-micro",
                i === current ? "font-semibold text-white" : reached ? "text-gray" : "text-muted",
              )}
            >
              {i + 1}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
