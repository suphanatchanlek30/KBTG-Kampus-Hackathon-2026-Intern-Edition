"use client";

import { Building2, ChevronRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomNav } from "@/components/ui/BottomNav";
import { useDeals, useMe } from "@/features/deals/hooks";
import { stateBadge } from "@/features/deals/state";
import { formatDayMonthTimeCompact } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealState, DealSummaryDTO } from "@/types/api";

const ACTIVE: DealState[] = ["WAITING_ACCEPT", "FUNDS_LOCKED", "BOOKING_FEE_RELEASED"];

// A finished deal opens its proof directly; anything else opens the deal status.
const hrefOf = (d: DealSummaryDTO) => (d.state === "RELEASED" ? `/deals/${d.id}/complete` : `/deals/${d.id}`);

function DealRow({ deal }: { deal: DealSummaryDTO }) {
  const badge = stateBadge(deal.state);
  const done = deal.state === "RELEASED";
  return (
    <Link
      href={hrefOf(deal)}
      className="flex items-center gap-3 rounded-card bg-card p-4 transition-transform active:scale-[0.98]"
    >
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
        {done ? <ReceiptText size={18} strokeWidth={1.5} /> : <Building2 size={18} strokeWidth={1.5} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-row-title">
          {deal.projectName} · {deal.unitNo}
        </span>
        <span className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-caption text-muted tabular-nums">{formatBaht(deal.totalSatang)}</span>
        </span>
        <span className="truncate text-micro text-muted">
          {deal.myRole === "TENANT" ? "คุณเป็นผู้เช่า" : "คุณเป็นผู้ให้เช่า"} ·{" "}
          {formatDayMonthTimeCompact(deal.createdAt)}
        </span>
      </span>
      {done && <span className="shrink-0 text-caption text-neon">ดูหลักฐาน</span>}
      <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />
    </Link>
  );
}

function Section({ title, deals }: { title: string; deals: DealSummaryDTO[] }) {
  if (deals.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 pt-1 text-caption text-muted">{title}</h2>
      {deals.map((d) => (
        <DealRow key={d.id} deal={d} />
      ))}
    </section>
  );
}

export function TransactionsScreen() {
  const router = useRouter();
  const { data: deals, error } = useDeals();
  const { data: me } = useMe();

  if (error && !deals) return <ErrorScreen error={error} title="โหลดธุรกรรมไม่ได้" />;
  if (!deals) return <ScreenSkeleton />;

  const active = deals.filter((d) => ACTIVE.includes(d.state));
  const past = deals.filter((d) => !ACTIVE.includes(d.state));
  const tenant = me?.user.role === "TENANT";

  return (
    <AppShell
      enter="fade"
      header={<AppHeader title="ธุรกรรม" left="back" onLeft={() => router.push("/home")} />}
      footer={
        <BottomNav
          active="transactions"
          notificationCount={me?.unreadNotifications ?? 0}
          scanHref={tenant ? "/scan" : undefined}
        />
      }
      indicatorClassName="bg-nav"
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      {deals.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
          <ReceiptText size={28} strokeWidth={1.4} />
          <p className="text-body">ยังไม่มีธุรกรรม</p>
        </div>
      )}
      <Section title="กำลังดำเนินการ" deals={active} />
      <Section title="ที่ผ่านมา" deals={past} />
    </AppShell>
  );
}
