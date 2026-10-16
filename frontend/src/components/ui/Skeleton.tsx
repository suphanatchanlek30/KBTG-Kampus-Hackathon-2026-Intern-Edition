import { cn } from "@/lib/cn";

/** กล่องโหลด — shimmer เลื่อน 1.4s บนพื้น card2 (§5.8) · ปิด animation เมื่อ reduced motion */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-shimmer rounded-xl bg-skeleton motion-reduce:animate-none", className)} />
  );
}
