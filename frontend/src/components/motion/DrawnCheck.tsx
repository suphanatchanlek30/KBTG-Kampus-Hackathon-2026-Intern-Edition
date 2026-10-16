"use client";

import { motion } from "motion/react";
import { useMotionMode } from "./MotionMode";

type DrawnCheckProps = {
  size: number;
  strokeWidth: number;
  /** false = แสดงเสร็จแล้ว ไม่วาด */
  draw?: boolean;
  /** วินาที */
  duration?: number;
  delay?: number;
  className?: string;
};

/** เครื่องหมายถูก (lucide Check) ที่วาดเส้นด้วย pathLength — stepper, เช็กลิสต์, "สร้างคำขอแล้ว" */
export function DrawnCheck({ size, strokeWidth, draw = true, duration = 0.3, delay = 0, className }: DrawnCheckProps) {
  const mode = useMotionMode();
  const animate = draw && mode === "full";
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        {...(animate && {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration, delay, ease: "easeOut" },
        })}
      />
    </svg>
  );
}
