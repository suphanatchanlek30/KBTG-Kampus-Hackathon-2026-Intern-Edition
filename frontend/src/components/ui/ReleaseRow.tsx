import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ReleaseRowProps = {
  label: ReactNode;
  title: ReactNode;
  amount: ReactNode;
  /** ก้อนที่จะปล่อยตอนนี้ = แถบ/ยอดเขียว (T5) */
  highlight?: boolean;
  /** ยอดใหญ่ 22px (T6) */
  large?: boolean;
};

/** แถวก้อนเงิน T5/T6 (Figma: แถบซ้าย 4×34 r2 · gap 10 · label 12 muted · ชื่อ 14/600) */
export function ReleaseRow({ label, title, amount, highlight = false, large = false }: ReleaseRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("h-[34px] w-1 shrink-0 rounded-[2px]", highlight ? "bg-neon" : "bg-white")} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted">{label}</span>
        <span className="truncate pt-[3px] text-body-strong">{title}</span>
      </div>
      <span
        className={cn(
          "tabular-nums",
          large ? "text-amount-md" : "text-amount-row",
          highlight ? "text-neon" : "text-white",
        )}
      >
        {amount}
      </span>
    </div>
  );
}
