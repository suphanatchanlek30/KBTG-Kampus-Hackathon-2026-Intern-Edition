import { Building2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { stateBadge } from "@/features/deals/state";
import { formatBaht } from "@/lib/format/money";
import type { HomeDTO } from "@/types/api";

export function ActiveDealCard({ deal }: { deal: HomeDTO["activeDeals"][number] }) {
  const badge = stateBadge(deal.state);
  return (
    <Link
      href={`/deals/${deal.dealId}`}
      className="flex items-center gap-2.5 rounded-card bg-card p-4 shadow-ring-neon transition-transform active:scale-[0.99]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-neon text-ink">
        <Building2 size={18} strokeWidth={1.5} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-semibold">
          {deal.projectName} · {deal.unitNo}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-caption text-muted tabular-nums">{formatBaht(deal.totalSatang)}</span>
        </div>
      </div>
      <ChevronRight size={16} strokeWidth={1.6} className="shrink-0 text-muted" />
    </Link>
  );
}
