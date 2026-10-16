"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** light = T8 (พื้นขาว) · dark = D4/D5/D11 */
  tone?: "light" | "dark";
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
const CLOSE_OFFSET = 120;
const CLOSE_VELOCITY = 500;

/**
 * Bottom sheet (docs/02-ui-spec.md §5.8): backdrop ดำ 60% + blur 2px · sheet เด้งขึ้นด้วย spring
 * ลากลงเกิน 120px หรือเร็วกว่า 500px/s = ปิด · กด Esc หรือแตะ backdrop = ปิด
 *
 * แสดงผ่าน portal ที่ชั้นบนสุดของกรอบแอป (PhoneFrame `[data-phone-overlay]`) — ถ้าวางไว้ใน <main> ของ AppShell
 * sheet จะติดอยู่ใต้แถบปุ่มด้านล่าง (main มี transform จากอนิเมชันเปลี่ยนหน้า = stacking context แยก)
 * แล้วการแตะปุ่มใน sheet จะไปโดนปุ่ม footer แทน
 */
export function BottomSheet({ open, onClose, tone = "dark", title, children, className }: BottomSheetProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  // หาปลายทาง portal หลัง mount (ฝั่ง client เท่านั้น — กัน hydration ไม่ตรง)
  // cleanup ทำงานเมื่อหน้าถูกซ่อนใน <Activity> ด้วย → เอา sheet ออก ไม่ค้างทับหน้าอื่น
  const marker = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const frame = marker.current?.closest("[data-phone-scope]");
    setHost(frame?.querySelector<HTMLElement>(":scope > [data-phone-overlay]") ?? document.body);
    return () => setHost(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onClose();
  };

  const sheet = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              "relative flex max-h-[90%] flex-col gap-4 rounded-t-[28px] px-5 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))] framed:pb-[30px]",
              tone === "light" ? "bg-white text-ink" : "border-t border-line bg-card text-white",
              className,
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : SPRING}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              aria-hidden
              className={cn(
                "mx-auto h-1 w-10 shrink-0 rounded-full",
                tone === "light" ? "bg-divider-light" : "bg-line",
              )}
            />
            {title && (
              <h2 id={titleId} className="text-sheet-title">
                {title}
              </h2>
            )}
            <div className="min-h-0 w-full overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <span ref={marker} hidden />
      {host && createPortal(sheet, host)}
    </>
  );
}
