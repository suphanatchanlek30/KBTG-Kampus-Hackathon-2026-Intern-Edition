"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useEnter, useLastSeen, useMotionMode } from "@/components/motion/MotionMode";
import { cn } from "@/lib/cn";

export type TimelineItem = {
  key: string;
  title: ReactNode;
  detail: ReactNode;
  status: "done" | "current" | "upcoming";
};

// §5.4: รายการ fade-up stagger 0.08s · เส้นแนวตั้งของขั้นที่ผ่านแล้ว scaleY 0.4s
const STAGGER = 0.08;

/**
 * ไทม์ไลน์ดีล L5 (Figma: แถวสูง 48 · วงกลม 20 r10 · เส้น 1.5×24 · gap 12 · ชื่อ 13.5/600 · รายละเอียด 12 muted)
 * done = วงเขียวมีถูก · current = วงขอบเขียวจุดกลาง · upcoming = วงขอบเทา
 */
export function Timeline({ title, items }: { title: ReactNode; items: TimelineItem[] }) {
  return (
    <section className="flex flex-col rounded-card bg-card p-4">
      <h2 className="pb-3 text-card-title">{title}</h2>
      <ol className="flex flex-col">
        {items.map((item, i) => (
          <TimelineRow key={item.key} item={item} index={i} last={i === items.length - 1} />
        ))}
      </ol>
    </section>
  );
}

function TimelineRow({ item, index, last }: { item: TimelineItem; index: number; last: boolean }) {
  const enter = useEnter();
  const full = useMotionMode() === "full";
  // เปลี่ยนเป็น done ตั้งแต่ครั้งก่อนที่เห็น (polling / ทำรายการแล้วกลับมา) = เพิ่งสำเร็จ → morph + ไฮไลต์
  const seenStatus = useLastSeen(item.status);
  const justDone = full && item.status === "done" && seenStatus !== "done";
  const at = index * STAGGER;

  return (
    <motion.li
      className="flex gap-3"
      aria-current={item.status === "current" ? "step" : undefined}
      {...enter(at, { y: 8, duration: 0.35 })}
    >
      <div className="flex w-5 shrink-0 flex-col items-center">
        <motion.span
          // key ตามสถานะ: เปลี่ยนสถานะ = จุดใหม่ เล่น morph วงกลมว่าง → ถูกเขียว
          key={item.status}
          className={cn(
            "relative flex size-5 items-center justify-center rounded-full border",
            item.status === "done" && "border-neon bg-neon text-ink",
            item.status === "current" && "border-neon bg-card",
            item.status === "upcoming" && "border-dim bg-card",
          )}
          {...(justDone
            ? {
                initial: { scale: 0.6 },
                animate: { scale: [0.6, 1.15, 1] },
                transition: { duration: 0.4, ease: "easeOut" },
              }
            : // ถูกขัดกลางทาง (เช่นหน้าถูกซ่อน) ให้กลับมาขนาดจริง
              { initial: false, animate: { scale: 1 } })}
        >
          {item.status === "current" && full && (
            <span
              aria-hidden
              className="absolute -inset-px rounded-full border border-neon motion-safe:animate-pulse-ring"
            />
          )}
          {item.status === "done" && <Check size={11} strokeWidth={2.4} />}
          {item.status === "current" && <span className="size-2 rounded-full bg-neon" />}
        </motion.span>
        {!last && (
          <span className="py-0.5">
            <motion.span
              key={item.status}
              className={cn("block h-6 w-[1.5px] origin-top", item.status === "done" ? "bg-neon" : "bg-line")}
              {...(full &&
                item.status === "done" && {
                  initial: { scaleY: 0 },
                  animate: { scaleY: 1 },
                  transition: { duration: 0.4, delay: justDone ? 0.3 : at + 0.15 },
                })}
            />
          </span>
        )}
      </div>
      <div className={cn("relative flex min-w-0 flex-1 flex-col", !last && "pb-1.5")}>
        {/* ข้อความที่เพิ่งสำเร็จ: ไฮไลต์พื้น neon/10 แล้วจางออกใน 1.2s */}
        {justDone && (
          <motion.span
            key={item.status}
            aria-hidden
            className="absolute -inset-x-2 inset-y-0 rounded-tile bg-neon/10"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        )}
        <span className="relative pt-1 text-row-title">{item.title}</span>
        <span className="relative text-caption text-muted">{item.detail}</span>
      </div>
    </motion.li>
  );
}
