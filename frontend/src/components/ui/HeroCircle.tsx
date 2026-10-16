import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** วงกลม hero สีเขียว + glow (Figma: ⌀92 หน้า L6/T4/T7 · ⌀84 หน้า T3 · shadow-hero) */
export function HeroCircle({
  size = 92,
  children,
  className,
}: {
  size?: 84 | 92;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center rounded-full bg-neon text-ink shadow-hero", className)}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
