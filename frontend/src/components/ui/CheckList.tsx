"use client";

import { motion } from "motion/react";
import { DrawnCheck } from "@/components/motion/DrawnCheck";
import { useMotionMode } from "@/components/motion/MotionMode";
import { SPRING_DOT } from "@/components/motion/tokens";

type CheckListProps = {
  items: string[];
  checked: boolean[];
  onToggle?: (index: number) => void;
};

/** เช็กลิสต์ T5/T6 (Figma: การ์ด r20 pad16 gap13 · กล่องติ๊ก 22 r11 · ข้อความ 13.5/500) */
export function CheckList({ items, checked, onToggle }: CheckListProps) {
  const full = useMotionMode() === "full";
  return (
    <ul className="flex flex-col gap-[13px] rounded-card bg-card p-4">
      {items.map((label, i) => (
        <li key={label}>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked[i] ?? false}
              onChange={() => onToggle?.(i)}
            />
            <span
              aria-hidden
              className="relative flex size-[22px] shrink-0 items-center justify-center rounded-full border border-stroke peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neon"
            >
              {/* ติ๊ก: พื้น neon scale 0.6 → 1 spring + วาดถูก 0.2s (§5.8) */}
              {checked[i] && (
                <motion.span
                  className="absolute -inset-px flex items-center justify-center rounded-full bg-neon text-ink"
                  initial={full ? { scale: 0.6 } : false}
                  animate={{ scale: 1 }}
                  transition={SPRING_DOT}
                >
                  <DrawnCheck size={13} strokeWidth={2.6} duration={0.2} delay={0.05} />
                </motion.span>
              )}
            </span>
            <span className="text-check-item">{label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
