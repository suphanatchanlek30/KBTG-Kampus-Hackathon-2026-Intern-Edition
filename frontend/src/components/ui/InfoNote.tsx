import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * กล่องข้อความแจ้ง — neon (L4: พื้น neon/12 ขอบ neon/35 · ข้อความ 12.5/19.4) · warn (T5)
 */
export function InfoNote({
  tone = "neon",
  icon,
  children,
  className,
}: {
  tone?: "neon" | "warn";
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5",
        // neon (L4): r20 · pad 14/16 · 12.5/19.4 · warn (T5): r14 · pad 12/14 · 12/18 ไม่มีขอบ
        tone === "neon"
          ? "rounded-card border border-neon/35 bg-neon/12 px-4 py-3.5 text-meta leading-[19.4px] text-mint-text"
          : "rounded-tile bg-warn/12 px-3.5 py-3 text-caption leading-[18px] text-warn-text",
        className,
      )}
    >
      <span className={cn("shrink-0", tone === "neon" ? "text-neon" : "text-warn")}>{icon}</span>
      <div>{children}</div>
    </div>
  );
}
