"use client";

import { motion, type Transition } from "motion/react";
import { HeroCircle } from "@/components/ui/HeroCircle";
import { useHaptic, useMotionMode, type MotionMode } from "./MotionMode";
import { EASE_IN_OUT, EASE_OUT_EXPO, REDUCED_FADE, SPRING_HERO } from "./tokens";

export type HeroIcon = "check" | "lock" | "shield";

type SuccessHeroProps = {
  icon: HeroIcon;
  size: 84 | 92;
};

/** ⌀ ไอคอน / ความหนาเส้น (หน่วย viewBox 24) — ตรงกับ lucide ที่ใช้ใน Phase 2 */
const ICON: Record<HeroIcon, { size: number; stroke: number }> = {
  check: { size: 44, stroke: 3 },
  lock: { size: 36, stroke: 2.4 },
  shield: { size: 38, stroke: 2.2 },
};

/** เวลาที่ไอคอนวาดเสร็จ → วงกลมเด้ง 1 → 1.08 → 1 */
const BUMP_AT: Record<HeroIcon, number> = { check: 0.8, lock: 0.7, shield: 0.8 };

/**
 * วงกลม hero ของหน้า success (§5.1) — L6/T7 ✓ วาดเส้น · T4 🔒 ห่วงล็อกลง · T3 🛡 วาดถูกในโล่
 * วงแหวน/ประกาย/ripple/glow breathing อยู่ใน ScreenBackground (hero) เพื่อไม่ถูก <main> ตัดขอบ
 */
export function SuccessHero({ icon, size }: SuccessHeroProps) {
  const mode = useMotionMode();
  const full = mode === "full";
  const bumpAt = BUMP_AT[icon];
  // haptic เฉพาะ "ได้รับเงินครบ" (L6/T7) ตามสเปก
  useHaptic(icon === "check" ? [12, 40, 18] : null, bumpAt * 1000);

  return (
    <motion.div {...enter(mode)}>
      <motion.div
        initial={false}
        animate={full ? { scale: [1, 1.08, 1] } : undefined}
        transition={{ duration: 0.25, delay: bumpAt, ease: "easeOut" }}
      >
        <HeroCircle size={size}>
          <HeroGlyph icon={icon} mode={mode} />
        </HeroCircle>
      </motion.div>
    </motion.div>
  );
}

function enter(mode: MotionMode) {
  if (mode === "static") return { initial: false as const };
  if (mode === "reduced") return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED_FADE };
  return { initial: { scale: 0 }, animate: { scale: 1 }, transition: { ...SPRING_HERO, delay: 0.1 } };
}

const DRAW: Transition = { duration: 0.45, ease: EASE_IN_OUT, delay: 0.35 };

function HeroGlyph({ icon, mode }: { icon: HeroIcon; mode: MotionMode }) {
  const { size, stroke } = ICON[icon];
  const full = mode === "full";
  const draw = full ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: DRAW } : {};

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon === "check" && <motion.path d="M20 6 9 17l-5-5" {...draw} />}
      {icon === "shield" && (
        <>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <motion.path d="m9 12 2 2 4-4" {...draw} />
        </>
      )}
      {icon === "lock" && (
        <>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          {/* ห่วงกุญแจ "ล็อกลง" y −6px → 0 (4 หน่วย viewBox × 1.5) ที่ t=0.4 */}
          <motion.path
            d="M7 11V7a5 5 0 0 1 10 0v4"
            {...(full && {
              initial: { y: -4 },
              animate: { y: 0 },
              transition: { duration: 0.3, delay: 0.4, ease: EASE_OUT_EXPO },
            })}
          />
        </>
      )}
    </svg>
  );
}
