import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** วงกลม hero สีเขียว + glow (Figma: ⌀92 L6/T7 · ⌀84 T3/T4 · ⌀64 T5/T6 ใช้เงาเล็กกว่า) */
export function HeroCircle({
  size = 92,
  children,
  className,
}: {
  size?: 64 | 84 | 92;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-neon text-ink",
        size === 64 ? "shadow-hero-sm" : "shadow-hero",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
