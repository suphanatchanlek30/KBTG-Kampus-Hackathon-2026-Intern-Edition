import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "raised" | "mint" | "white" | "outline-neon";

const variants: Record<CardVariant, string> = {
  default: "rounded-card bg-card",
  raised: "rounded-card bg-card2",
  mint: "rounded-card bg-grad-mint text-ink-mint shadow-mint",
  white: "rounded-card bg-white text-ink",
  "outline-neon": "rounded-card-xl border border-neon/35 bg-grad-request",
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  bare?: boolean;
};

export function Card({ variant = "default", bare = false, className, ...props }: CardProps) {
  return <div className={cn(variants[variant], !bare && "flex flex-col gap-2.5 p-4", className)} {...props} />;
}
