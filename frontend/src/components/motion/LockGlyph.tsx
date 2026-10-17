"use client";

import { motion, type Transition } from "motion/react";

type LockGlyphProps = {
  size: number;
  strokeWidth: number;
  dropPx?: number;
  transition?: Transition;
};

export function LockGlyph({ size, strokeWidth, dropPx, transition }: LockGlyphProps) {
  const dropUnits = dropPx ? (dropPx * 24) / size : 0;
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
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <motion.path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        {...(dropUnits && { initial: { y: -dropUnits }, animate: { y: 0 }, transition })}
      />
    </svg>
  );
}
