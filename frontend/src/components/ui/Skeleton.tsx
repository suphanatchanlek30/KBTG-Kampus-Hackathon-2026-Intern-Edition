import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-shimmer rounded-xl bg-skeleton motion-reduce:animate-none", className)} />
  );
}
