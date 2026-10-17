"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionMode, type MotionMode } from "@/components/motion/MotionMode";
import { EASE_OUT_EXPO, REDUCED_FADE } from "@/components/motion/tokens";
import { cn } from "@/lib/cn";
import { HomeIndicator } from "./HomeIndicator";
import { StatusBar } from "./StatusBar";

type AppShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
  indicatorClassName?: string;
  enter?: PageEnter;
  className?: string;
};

export type PageEnter = "push" | "modal" | "fade";

function pageEnter(enter: PageEnter | undefined, mode: MotionMode) {
  if (!enter || mode === "static") return {};
  if (mode === "reduced") return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED_FADE };
  const from = enter === "push" ? { x: 24 } : enter === "modal" ? { y: 24 } : {};
  const duration = enter === "push" ? 0.28 : enter === "modal" ? 0.32 : 0.2;
  return {
    initial: { opacity: 0, ...from },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration, ease: EASE_OUT_EXPO },
  };
}

export function AppShell({
  children,
  header,
  footer,
  background,
  indicatorClassName,
  enter,
  className,
}: AppShellProps) {
  const motionProps = pageEnter(enter, useMotionMode());
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)] framed:pt-0">
      {background && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {background}
        </div>
      )}
      <div className="relative z-10 shrink-0">
        <StatusBar />
        {header && <motion.div {...motionProps}>{header}</motion.div>}
      </div>
      <motion.main
        {...motionProps}
        className={cn(
          "relative z-0 no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [&>*]:shrink-0",
          className,
        )}
      >
        {children}
      </motion.main>
      {footer && (
        <motion.div className="relative z-10 shrink-0" {...motionProps}>
          {footer}
        </motion.div>
      )}
      <HomeIndicator className={cn("relative z-10", indicatorClassName)} />
    </div>
  );
}
