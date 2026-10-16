"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

const DURATION_MS = 2500;
let nextId = 0;

const useToastStore = create<{ items: ToastItem[]; dismiss: (id: number) => void }>((set) => ({
  items: [],
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

function show(kind: ToastKind, message: string) {
  const id = ++nextId;
  useToastStore.setState((s) => ({ items: [...s.items, { id, kind, message }] }));
  setTimeout(() => useToastStore.getState().dismiss(id), DURATION_MS);
}

/** เรียกได้จากทุกที่ เช่น `toast.success("คัดลอกแล้ว")` */
export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
};

/** วางครั้งเดียวใน PhoneFrame — toast เลื่อนลงจากบน อยู่ 2.5 วินาที แล้วจางออก (§5.8) */
export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-5 framed:top-[58px]"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.kind === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "flex max-w-full items-center gap-2 rounded-full border bg-card2 px-4 py-2.5 text-body-strong shadow-lg",
              t.kind === "success" ? "border-neon/35" : "border-danger/50",
            )}
          >
            {t.kind === "success" ? (
              <CircleCheck size={18} className="shrink-0 text-neon" />
            ) : (
              <CircleAlert size={18} className="shrink-0 text-danger" />
            )}
            <span className="truncate">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
