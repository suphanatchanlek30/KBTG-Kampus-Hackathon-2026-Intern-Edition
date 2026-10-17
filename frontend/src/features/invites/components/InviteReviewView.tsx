"use client";

import { Check, ChevronRight, History, Lock, ShieldCheck, User, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RulesList } from "@/components/ui/RulesList";
import { TrancheRow } from "@/components/ui/TrancheRow";
import { brand } from "@/config/brand";
import { formatDayMonth, formatExpiry } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO } from "@/types/api";

type InviteReviewViewProps = {
  deal: DealDTO;
  rejecting?: boolean;
  onBack?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
};

export function InviteReviewView({ deal, rejecting, onBack, onAccept, onReject }: InviteReviewViewProps) {
  const { property, landlord, amounts } = deal;
  const moveIn = `${deal.moveInDate}T00:00:00+07:00`;

  return (
    <AppShell
      enter="push"
      background={<ScreenBackground screen="T2" />}
      header={<AppHeader title="ตรวจสอบรายละเอียดดีล" left="back" right="menu" onLeft={onBack} />}
      footer={
        <StickyFooter>
          <Button
            onClick={onAccept}
            iconLeft={<Lock size={18} strokeWidth={1.65} />}
            iconRight={<ChevronRight size={17} strokeWidth={1.77} />}
          >
            ยอมรับและกันเงิน {formatBaht(amounts.totalSatang)}
          </Button>
          <Button variant="secondary" loading={rejecting} onClick={onReject}>
            ปฏิเสธดีล
          </Button>
        </StickyFooter>
      }
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      <div className="flex flex-col">
        <h2 className="text-title">
          {property.propertyType} {property.projectName}
        </h2>
        <p className="pt-1 text-meta text-gray">
          ห้อง {property.unitNo} · {property.detailLabel} · ใกล้ {property.nearbyLabel}
        </p>
      </div>

      <section className="flex items-center gap-3 rounded-card bg-card p-4">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
          <User size={18} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption text-muted">ผู้ให้เช่า (ผู้รับเงิน)</span>
          <span className="text-header">{landlord.displayName}</span>
          <span className="text-caption text-muted">
            {landlord.bankName} · {landlord.accountNoMasked}
          </span>
        </div>
        {landlord.nameVerified && (
          <Badge variant="neon">
            <Check size={11} strokeWidth={1.47} />
            ชื่อตรงบัญชี
          </Badge>
        )}
      </section>

      <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-muted">ยอดที่จะกันไว้</span>
          <span className="text-amount-lg tabular-nums">{formatBaht(amounts.totalSatang)}</span>
        </div>
        <TrancheRow
          index={1}
          highlight
          title="ค่าจอง"
          description={`ปล่อยเมื่อคุณยืนยันว่าดูห้องแล้ว · ${formatDayMonth(deal.viewingAt)}`}
          amount={formatBaht(amounts.bookingFeeSatang)}
        />
        <TrancheRow
          index={2}
          title="มัดจำหลัก"
          description={`ปล่อยเมื่อคุณยืนยันว่าเข้าอยู่แล้ว · ${formatDayMonth(moveIn)}`}
          amount={formatBaht(amounts.mainDepositSatang)}
        />
      </section>

      <RulesList
        className="gap-3"
        rules={[
          { icon: History, text: `หมดอายุ ${formatExpiry(deal.expiresAt)} — ส่วนที่ยังไม่ปล่อยคืนคุณอัตโนมัติ` },
          { icon: UserCheck, text: "ยกเลิกได้เมื่อทั้งสองฝ่ายยินยอม · ค่าจองที่ปล่อยแล้วไม่คืน" },
        ]}
      />

      <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neon/12 px-3 py-1.5 text-caption font-medium text-neon">
        <ShieldCheck size={13} strokeWidth={1.5} />
        {brand.name} ปกป้องเงินของคุณจนกว่าจะเข้าอยู่จริง
      </p>
    </AppShell>
  );
}
