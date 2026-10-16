import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neon" | "neon-soft" | "warn-soft" | "muted" | "dark" | "new" | "count";

// Figma: r100 · pad 3/10 · gap 4 · 11/600 (ค่าจาก T2, L2, L3, L5, L1)
const variants: Record<BadgeVariant, string> = {
  /** "✓ ชื่อตรงบัญชี" (T2) */
  neon: "bg-neon text-ink",
  /** "ค่าธรรมเนียม 0 บาท", "ปรับยอด" */
  "neon-soft": "bg-neon/12 text-neon",
  /** "กำลังดำเนินการ" */
  "warn-soft": "bg-warn/12 text-warn",
  /** "รอผู้เช่ายอมรับ" (D1) / ดีลจบแบบไม่สำเร็จ */
  muted: "bg-white/8 text-gray",
  /** "หลัก" บนการ์ดยอดเงิน */
  dark: "bg-ink px-2.5 py-0.5 text-mint-mid",
  /** chip "ใหม่" */
  new: "bg-neon px-[9px] py-px text-count text-ink",
  /** ตัวเลขแจ้งเตือนสีแดง (กระดิ่ง) */
  count: "h-4 min-w-4 justify-center border-2 border-bg bg-danger px-1 py-0 text-count text-white",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export function Badge({ variant = "neon-soft", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-badge whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
