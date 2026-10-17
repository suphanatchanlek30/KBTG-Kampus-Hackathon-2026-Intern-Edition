import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TrancheRowProps = {
  index: number;
  title: ReactNode;
  description: ReactNode;
  amount: ReactNode;
  highlight?: boolean;
};

export function TrancheRow({ index, title, description, amount, highlight = false }: TrancheRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold text-ink",
          highlight ? "bg-neon" : "bg-white",
        )}
      >
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="pt-[3px] text-body-strong">{title}</span>
        <span className="text-caption text-muted">{description}</span>
      </div>
      <span className={cn("text-amount-row tabular-nums", highlight ? "text-neon" : "text-white")}>{amount}</span>
    </div>
  );
}
