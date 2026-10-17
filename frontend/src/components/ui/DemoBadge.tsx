import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { cn } from "@/lib/cn";

export function DemoBadge({ className }: { className?: string }) {
  if (!env.showDemoBadge) return null;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border border-warn/40 bg-warn/12 px-3 py-1 text-badge text-warn",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-warn" />
      {brand.disclaimer}
    </span>
  );
}
