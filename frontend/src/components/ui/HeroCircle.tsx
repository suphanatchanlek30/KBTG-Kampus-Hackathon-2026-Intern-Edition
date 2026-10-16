import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** วงกลม hero สีเขียว + glow (Figma: ⌀92 L6/T7 · ⌀84 T3/T4 · ⌀64 T5/T6 ใช้เงาเล็กกว่า) */
export function HeroCircle({
  size = 92,
  glow = true,
  children,
  className,
}: {
  size?: 64 | 84 | 92;
  /**
   * false = ไม่ใส่เงาที่ตัววงกลม — ใช้เมื่อวงกลมอยู่ชิดขอบบนของพื้นที่เลื่อน (เงาจะถูกตัดเป็นเส้นตรง)
   * แล้วให้ ScreenBackground hero วาด glow แทน (SuccessHero)
   */
  glow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-neon text-ink",
        glow && (size === 64 ? "shadow-hero-sm" : "shadow-hero"),
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
