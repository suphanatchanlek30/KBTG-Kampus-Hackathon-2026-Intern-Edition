import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neon" | "neon-soft" | "warn-soft" | "muted" | "dark" | "new" | "count";

const variants: Record<BadgeVariant, string> = {
  neon: "bg-neon text-ink",
  "neon-soft": "bg-neon/12 text-neon",
  "warn-soft": "bg-warn/12 text-warn",
  muted: "bg-white/8 text-gray",
  dark: "bg-ink px-2.5 py-0.5 text-mint-mid",
  new: "bg-neon px-[9px] py-px text-count text-ink",
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
