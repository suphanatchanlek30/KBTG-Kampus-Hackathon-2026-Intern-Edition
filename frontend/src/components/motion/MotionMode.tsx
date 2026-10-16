"use client";

import { useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { EASE_OUT_EXPO, REDUCED_FADE } from "./tokens";

/**
 * full = ตามสเปก §5 · reduced = prefers-reduced-motion (ไม่มีลูป · fade 0.15s · ตัวเลขขึ้นค่าสุดท้ายทันที)
 * static = แสดงเฟรมสุดท้ายทันที ไม่มีลูป/haptic — ใช้ใน /dev/overlay และ /dev/components เพื่อเทียบกับ mockup
 */
export type MotionMode = "full" | "reduced" | "static";

const StaticContext = createContext(false);

/** ห่อหน้าจอที่ต้องการภาพนิ่ง (เฟรมสุดท้ายของทุกอนิเมชัน) */
export function StaticMotion({ children }: { children: ReactNode }) {
  return <StaticContext value={true}>{children}</StaticContext>;
}

export function useMotionMode(): MotionMode {
  const isStatic = useContext(StaticContext);
  const reduced = useReducedMotion();
  if (isStatic) return "static";
  return reduced ? "reduced" : "full";
}

type EnterOptions = {
  /** ระยะเลื่อนขึ้นตอนเข้า (px) */
  y?: number;
  duration?: number;
  /** ใช้ spring แทน duration/ease */
  spring?: Transition;
};

type EnterProps = {
  initial: false | TargetAndTransition;
  animate?: TargetAndTransition;
  transition?: Transition;
};

/**
 * props สำหรับ motion.* ที่ "fade-up" ตอนหน้าแสดง — ใช้แทน element เดิมแบบ 1:1 (motion.h2 แทน h2)
 * เพื่อไม่ให้ layout/gap ของหน้าเปลี่ยน
 */
export function useEnter() {
  const mode = useMotionMode();
  return (delay: number, { y = 12, duration = 0.4, spring }: EnterOptions = {}): EnterProps => {
    if (mode === "static") return { initial: false };
    if (mode === "reduced") {
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { ...REDUCED_FADE, delay } };
    }
    return {
      initial: { opacity: 0, y },
      animate: { opacity: 1, y: 0 },
      transition: spring ? { ...spring, delay } : { duration, delay, ease: EASE_OUT_EXPO },
    };
  };
}

/** สั่นตามจังหวะอนิเมชัน (haptic ยังทำงานใน reduced motion — ไม่ใช่การเคลื่อนไหว) · null = ไม่สั่น */
export function useHaptic(pattern: number[] | null, delayMs: number) {
  const mode = useMotionMode();
  const key = pattern?.join(",") ?? "";
  // สั่นครั้งเดียวต่อ mount — Activity แสดงหน้าเดิมซ้ำ (back/forward) effect จะรันใหม่
  const fired = useRef(false);
  useEffect(() => {
    if (mode === "static" || !key || fired.current) return;
    const t = setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(key.split(",").map(Number));
    }, delayMs);
    return () => clearTimeout(t);
  }, [mode, key, delayMs]);
}
