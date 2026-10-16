"use client";

import { Building2, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMotionMode } from "@/components/motion/MotionMode";
import { brand } from "@/config/brand";
import { formatDayMonthTimeCompact, formatTime } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { PendingInviteDTO } from "@/types/api";

/** การ์ดคำขอใหม่บน T1 (Figma: r20 · card · ขอบ neon 1.5 · pad 16 · gap 10) */
export function RequestCard({ invite }: { invite: PendingInviteDTO }) {
  const full = useMotionMode() === "full";
  return (
    <section className="relative flex flex-col gap-2.5 rounded-card bg-card p-4 shadow-ring-neon">
      {/* ขอบเรืองแสง 2.4s ไป-กลับ (§5.6) — ชั้นแยกเปลี่ยนแค่ opacity */}
      {full && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card opacity-0 shadow-request-glow [--breathe-delay:0s] motion-safe:animate-breathe"
        />
      )}
      <div className="flex items-center gap-3">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile border border-line bg-card">
          <Image src={brand.mark.src} alt="" width={20} height={19} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-header">คำขอ {brand.name} ใหม่</p>
          <p className="text-caption text-muted">
            จากคุณ{invite.fromShortName} · {formatTime(invite.sentAt)}
          </p>
        </div>
        <span aria-label="ใหม่" className="relative size-2 shrink-0 rounded-full bg-neon shadow-dot-neon">
          {full && <span className="absolute inset-0 rounded-full bg-neon motion-safe:animate-ping" />}
        </span>
      </div>

      <div className="flex items-center gap-2.5 rounded-tile bg-ink p-2.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-neon text-ink">
          <Building2 size={18} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate pt-1 text-body font-semibold">มัดจำห้อง {invite.projectName}</p>
          <p className="truncate text-caption text-muted">
            ห้อง {invite.unitNo} · ดูห้อง {formatDayMonthTimeCompact(invite.viewingAt)}
          </p>
        </div>
        <span className="text-section text-neon tabular-nums">{formatBaht(invite.totalSatang)}</span>
      </div>

      <Link
        href={`/invites/${invite.shareCode}`}
        className="flex h-[42px] items-center justify-center gap-2 rounded-full bg-neon text-body-strong text-ink transition-transform active:scale-[0.97]"
      >
        ตรวจสอบคำขอ
        <ChevronRight size={16} strokeWidth={1.8} />
      </Link>
    </section>
  );
}
