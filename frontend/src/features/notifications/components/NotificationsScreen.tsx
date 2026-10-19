"use client";

import { Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { useMarkAllRead, useNotifications } from "@/features/deals/hooks";
import { formatDayMonthTimeCompact } from "@/lib/format/date";
import { cn } from "@/lib/cn";
import type { NotificationDTO } from "@/types/api";

const hrefOf = (n: NotificationDTO) => {
  if (n.type === "DEAL_INVITE" || !n.dealId) return "/home";
  // The final release links straight to the deal's proof.
  return n.type === "MAIN_DEPOSIT_RELEASED" ? `/deals/${n.dealId}/complete` : `/deals/${n.dealId}`;
};

export function NotificationsScreen() {
  const router = useRouter();
  const { data, error } = useNotifications();
  const markAll = useMarkAllRead();

  const [freshIds, setFreshIds] = useState<Set<string> | null>(null);
  if (data && freshIds === null) setFreshIds(new Set(data.items.filter((n) => !n.readAt).map((n) => n.id)));
  const hasUnread = (data?.unreadCount ?? 0) > 0;
  useEffect(() => {
    if (hasUnread && markAll.isIdle) markAll.mutate();
  }, [hasUnread, markAll]);

  if (error && !data) return <ErrorScreen error={error} title="โหลดแจ้งเตือนไม่ได้" />;
  if (!data) return <ScreenSkeleton />;

  return (
    <AppShell
      enter="fade"
      header={<AppHeader title="แจ้งเตือน" left="back" onLeft={() => router.push("/home")} />}
      footer={<BottomNav active="notifications" />}
      indicatorClassName="bg-nav"
      className="flex flex-col gap-2.5 px-5 pt-1 pb-2"
    >
      {data.items.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
          <Bell size={28} strokeWidth={1.4} />
          <p className="text-body">ยังไม่มีแจ้งเตือน</p>
        </div>
      )}
      {data.items.map((n) => {
        const fresh = !n.readAt || freshIds?.has(n.id);
        return (
          <Link
            key={n.id}
            href={hrefOf(n)}
            className={cn(
              "flex items-center gap-3 rounded-card bg-card p-4 transition-transform active:scale-[0.98]",
              fresh && "shadow-ring-neon",
            )}
          >
            <span className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
              <Bell size={18} strokeWidth={1.5} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-row-title">{n.title}</span>
              <span className="text-caption text-muted">{n.body}</span>
              <span className="text-micro text-muted">{formatDayMonthTimeCompact(n.createdAt)}</span>
            </span>
            {fresh && <span aria-label="ใหม่" className="size-2 shrink-0 rounded-full bg-neon shadow-dot-neon" />}
            <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />
          </Link>
        );
      })}
    </AppShell>
  );
}
