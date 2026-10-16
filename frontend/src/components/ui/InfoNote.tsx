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
        "flex gap-2.5 rounded-card border px-4 py-3.5",
        tone === "neon" ? "border-neon/35 bg-neon/12 text-mint-text" : "border-warn/35 bg-warn/12 text-warn-text",
        className,
      )}
    >
      <span className={cn("shrink-0", tone === "neon" ? "text-neon" : "text-warn")}>{icon}</span>
      <div className="text-meta leading-[19.4px]">{children}</div>
    </div>
  );
}
