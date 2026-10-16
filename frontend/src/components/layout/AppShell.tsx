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
  /** AppHeader / HomeHeader — ไม่เลื่อนตามเนื้อหา */
  header?: ReactNode;
  /** StickyFooter / BottomNav — ติดล่างเสมอ */
  footer?: ReactNode;
  /** ลายพื้นหลัง (glow, วงแหวน) วางแบบ absolute ใต้เนื้อหา */
  background?: ReactNode;
  /** สีพื้นแถบ home indicator — หน้าที่มี BottomNav ใช้ "bg-nav" ให้ต่อกับแถบ nav */
  indicatorClassName?: string;
  /**
   * อนิเมชันตอนหน้าแสดง (§5.7) — push = หน้ามีปุ่ม ← · modal = หน้ามีปุ่ม × · fade = หน้าหลัก
   * enter-only: motion เล่นใหม่ทุกครั้งที่ Activity แสดงหน้าเดิม จึงไม่ต้องพึ่ง template.tsx (ซึ่งไม่ remount)
   */
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

/**
 * โครงหน้าจอ: [status bar] · header · เนื้อหา (เลื่อนได้) · footer · [home indicator]
 * ตามเฟรม 393×852: 50 · 52|64 · … · 68|64 · 30
 */
export function AppShell({
  children,
  header,
  footer,
  background,
  indicatorClassName,
  enter,
  className,
}: AppShellProps) {
  // status bar / home indicator ปลอมเป็นของ "เครื่อง" ไม่ขยับตามหน้า
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
          // [&>*]:shrink-0 — เนื้อหาสูงเกินจอต้องเลื่อนดู ไม่ใช่บีบการ์ดให้เตี้ยลง (flex column จะ shrink ลูกโดยปริยาย)
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
