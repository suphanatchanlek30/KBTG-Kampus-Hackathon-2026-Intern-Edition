"use client";

import { useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { EASE_OUT_EXPO, REDUCED_FADE } from "./tokens";

export type MotionMode = "full" | "reduced" | "static";

const StaticContext = createContext(false);

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
  y?: number;
  duration?: number;
  spring?: Transition;
};

type EnterProps = {
  initial: false | TargetAndTransition;
  animate?: TargetAndTransition;
  transition?: Transition;
};

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

export function useLastSeen<T>(value: T): T {
  const [seen, setSeen] = useState(value);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  useLayoutEffect(() => {
    clearTimeout(pending.current);
    return () => {
      pending.current = setTimeout(() => setSeen(value), 0);
    };
  }, [value]);
  return seen;
}

export function useHaptic(pattern: number[] | null, delayMs: number) {
  const mode = useMotionMode();
  const key = pattern?.join(",") ?? "";
  useEffect(() => {
    if (mode === "static" || !key) return;
    const t = setTimeout(() => navigator.vibrate?.(key.split(",").map(Number)), delayMs);
    return () => clearTimeout(t);
  }, [mode, key, delayMs]);
}
