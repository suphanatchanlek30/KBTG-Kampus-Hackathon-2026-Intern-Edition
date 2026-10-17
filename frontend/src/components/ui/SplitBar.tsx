"use client";

import { motion } from "motion/react";
import { useMotionMode } from "@/components/motion/MotionMode";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export function SplitBar({ first, total }: { first: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (first / total) * 100)) : 0;
  const transition = useMotionMode() === "full" ? SPRING : { duration: 0 };
  return (
    <div role="img" aria-label={`ค่าจอง ${Math.round(pct)}% ของยอดรวม`} className="flex h-2 gap-1">
      <motion.span
        className="h-full basis-0 rounded-[4px] bg-neon"
        initial={false}
        animate={{ flexGrow: pct }}
        transition={transition}
      />
      <motion.span
        className="h-full basis-0 rounded-[4px] bg-white"
        initial={false}
        animate={{ flexGrow: 100 - pct }}
        transition={transition}
      />
    </div>
  );
}
