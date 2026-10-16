import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TrancheRowProps = {
  index: number;
  title: ReactNode;
  description: ReactNode;
  amount: ReactNode;
  /** ก้อนแรก (ค่าจอง) = วงกลม/ยอดสีเขียว · ก้อนสอง = ขาว */
  highlight?: boolean;
};

/** แถวก้อนเงิน L2/T2 (Figma: วงกลม 24 r12 · gap 10 · ชื่อ 14/600 · คำอธิบาย 12 · ยอด 16/600) */
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
        <span className="text-body-strong leading-[23.2px]">{title}</span>
        <span className="text-caption text-muted">{description}</span>
      </div>
      <span className={cn("text-amount-row tabular-nums", highlight ? "text-neon" : "text-white")}>{amount}</span>
    </div>
  );
}
