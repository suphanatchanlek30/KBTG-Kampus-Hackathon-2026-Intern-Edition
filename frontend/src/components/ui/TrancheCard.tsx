import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TrancheCardProps = {
  index: number;
  title: ReactNode;
  amount: ReactNode;
  description: ReactNode;
  meta: ReactNode;
  metaIcon: ReactNode;
  highlight?: boolean;
};

export function TrancheCard({
  index,
  title,
  amount,
  description,
  meta,
  metaIcon,
  highlight = false,
}: TrancheCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-1 rounded-card bg-card px-4 py-3.5",
        highlight ? "shadow-accent-neon" : "shadow-accent-white",
      )}
    >
      <div className="flex h-6 items-center gap-3">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold text-ink",
            highlight ? "bg-neon" : "bg-white",
          )}
        >
          {index}
        </span>
        <span className={cn("flex-1 text-section", highlight && "text-neon")}>{title}</span>
        <span className={cn("text-amount-row tabular-nums", highlight && "text-neon")}>{amount}</span>
      </div>
      <p className="text-caption text-gray">{description}</p>
      <p className="flex items-center gap-1.5 text-service-label text-muted">
        <span className="shrink-0">{metaIcon}</span>
        {meta}
      </p>
    </section>
  );
}
