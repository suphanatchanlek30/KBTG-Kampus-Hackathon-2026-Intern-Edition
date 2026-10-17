import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
