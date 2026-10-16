import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * พื้นที่ปุ่มล่างจอ (Figma: pad 8/20/6/20 · gap 10)
 * มือถือจริง: ขอบล่าง max(16px, safe-area) · ในกรอบ: 6px แล้วต่อด้วย home indicator 30px
 */
export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] framed:pb-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
