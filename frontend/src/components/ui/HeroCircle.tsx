import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function HeroCircle({
  size = 92,
  glow = true,
  children,
  className,
}: {
  size?: 64 | 84 | 92;
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
