"use client";

import { Building2, Calendar, CalendarCheck, ChevronRight, KeyRound, QrCode, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Timeline } from "@/components/ui/Timeline";
import type { DealDTO } from "@/types/api";
import { stateBadge, timelineSteps } from "../state";
import { FundsSecuredCard } from "./FundsSecuredCard";

export type DealStatusAction =
  "show-qr" | "add-viewing" | "add-move-in" | "confirm-viewing" | "confirm-move-in" | "receipt";

type DealStatusViewProps = {
  deal: DealDTO;
  onBack?: () => void;
  onShare?: () => void;
  onAction?: (action: DealStatusAction) => void;
};

/** ปุ่มหลักตาม state และ role (docs/01-user-flow.md §6 "สิ่งที่แต่ละหน้าจอแสดงตาม state") */
function primaryAction(deal: DealDTO): { action: DealStatusAction; label: string; icon: ReactNode } | null {
  const tenant = deal.myRole === "TENANT";
  switch (deal.state) {
    case "WAITING_ACCEPT":
      return tenant
        ? null
        : { action: "show-qr", label: "แสดง QR อีกครั้ง", icon: <QrCode size={18} strokeWidth={1.65} /> };
    case "FUNDS_LOCKED":
      return tenant
        ? {
            action: "confirm-viewing",
            label: "ยืนยันว่าดูห้องแล้ว",
            icon: <CalendarCheck size={18} strokeWidth={1.65} />,
          }
        : { action: "add-viewing", label: "เพิ่มนัดดูห้องลงปฏิทิน", icon: <Calendar size={18} strokeWidth={1.65} /> };
    case "BOOKING_FEE_RELEASED":
      return tenant
        ? { action: "confirm-move-in", label: "ยืนยันการเข้าอยู่", icon: <KeyRound size={18} strokeWidth={1.65} /> }
        : { action: "add-move-in", label: "เพิ่มวันเข้าอยู่ลงปฏิทิน", icon: <Calendar size={18} strokeWidth={1.65} /> };
    case "RELEASED":
      return { action: "receipt", label: "ดูหลักฐานดีล", icon: <ReceiptText size={18} strokeWidth={1.65} /> };
    default:
      return null;
  }
}

/**
 * L5 สถานะดีล (ผู้ให้เช่า) · D1 = state WAITING_ACCEPT · D8 = มุมผู้เช่า
 * ⚠️ D1 / D8 ยังรออนุมัติดีไซน์ — ใช้ layout L5 ตาม docs/01-user-flow.md §7
 */
export function DealStatusView({ deal, onBack, onShare, onAction }: DealStatusViewProps) {
  const badge = stateBadge(deal.state);
  const counterparty =
    deal.myRole === "TENANT"
      ? `ผู้ให้เช่า ${deal.landlord.shortName}`
      : deal.tenant
        ? `ผู้เช่า ${deal.tenant.shortName}`
        : "รอผู้เช่ายอมรับ";
  const primary = primaryAction(deal);
  const toConfirm = primary?.action === "confirm-viewing" || primary?.action === "confirm-move-in";

  return (
    <AppShell
      background={<ScreenBackground screen="L5" />}
      header={<AppHeader title="สถานะดีล" left="back" right="share" onLeft={onBack} onRight={onShare} />}
      footer={
        primary && (
          <StickyFooter>
            <Button
              onClick={() => onAction?.(primary.action)}
              iconLeft={primary.icon}
              iconRight={toConfirm ? <ChevronRight size={17} strokeWidth={1.77} /> : undefined}
            >
              {primary.label}
            </Button>
          </StickyFooter>
        )
      }
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      <section className="flex items-center gap-3 rounded-card bg-card p-4">
        <div className="flex size-[46px] shrink-0 items-center justify-center rounded-tile bg-neon text-ink">
          <Building2 size={20} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-header">{deal.property.projectName}</p>
          <p className="truncate text-caption text-muted">
            ห้อง {deal.property.unitNo} · {counterparty}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </section>

      <FundsSecuredCard deal={deal} />

      <Timeline title="ไทม์ไลน์ดีล" items={timelineSteps(deal)} />
    </AppShell>
  );
}
