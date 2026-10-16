"use client";

import { Building2, Calendar, ChevronRight, Clock, Key, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RulesList } from "@/components/ui/RulesList";
import { StepTabs } from "@/components/ui/StepTabs";
import { TrancheCard } from "@/components/ui/TrancheCard";
import { brand } from "@/config/brand";
import { formatDate, formatDateTime, formatExpiry } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { PartyDTO, PropertyDTO } from "@/types/api";
import { dealExpiry } from "../rules";
import type { DealDraft } from "../schema";
import { DEAL_STEPS } from "./CreateDealView";

type ReviewDealViewProps = {
  draft: DealDraft;
  property: PropertyDTO;
  landlord: Pick<PartyDTO, "displayName" | "accountNoMasked">;
  submitting?: boolean;
  onSubmit?: () => void;
};

/** L3 — สร้างดีล ขั้นที่ 2 ตรวจสอบและส่ง */
export function ReviewDealView({ draft, property, landlord, submitting, onSubmit }: ReviewDealViewProps) {
  const mainDeposit = draft.totalSatang - draft.bookingFeeSatang;
  const moveIn = `${draft.moveInDate}T00:00:00+07:00`;

  return (
    <AppShell
      background={<ScreenBackground screen="L3" />}
      header={
        <>
          <AppHeader title={`สร้างดีล ${brand.name}`} left="back" right="menu" />
          <StepTabs steps={DEAL_STEPS} current={1} />
        </>
      }
      footer={
        <StickyFooter>
          <Button loading={submitting} onClick={onSubmit} iconRight={<ChevronRight size={17} strokeWidth={1.77} />}>
            สร้างคำขอ {brand.name}
          </Button>
        </StickyFooter>
      }
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-[46px] shrink-0 items-center justify-center rounded-tile bg-neon text-ink">
            <Building2 size={20} strokeWidth={1.5} />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-header">
              {property.projectName} · {property.unitNo}
            </p>
            <p className="truncate text-caption text-muted">
              เงินเข้าบัญชี {landlord.displayName} · {landlord.accountNoMasked}
            </p>
          </div>
        </div>
        <hr className="border-line" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-caption text-muted">ยอดที่ผู้เช่าจะกันไว้</span>
            <span className="text-amount-lg tabular-nums">{formatBaht(draft.totalSatang)}</span>
          </div>
          <Badge variant="neon-soft">ค่าธรรมเนียม 0 บาท</Badge>
        </div>
      </section>

      <TrancheCard
        index={1}
        highlight
        title="ค่าจอง"
        amount={formatBaht(draft.bookingFeeSatang)}
        description="ปล่อยเมื่อผู้เช่ากดยืนยัน “ได้ดูห้องแล้ว”"
        metaIcon={<Calendar size={13} strokeWidth={1.3} />}
        meta={`นัดดูห้อง ${formatDateTime(draft.viewingAt)}`}
      />
      <TrancheCard
        index={2}
        title="มัดจำหลัก"
        amount={formatBaht(mainDeposit)}
        description="ปล่อยเมื่อผู้เช่ากดยืนยัน “ได้รับกุญแจและเข้าอยู่แล้ว”"
        metaIcon={<Key size={13} strokeWidth={1.3} />}
        meta={`วันเข้าอยู่ ${formatDate(moveIn)}`}
      />

      <section className="flex flex-col gap-[9px] rounded-card bg-card p-4">
        <h2 className="flex items-center gap-2 text-card-title">
          <ShieldCheck size={15} strokeWidth={1.5} className="text-neon" />
          กติกาของดีลนี้
        </h2>
        <RulesList
          rules={[
            {
              icon: Clock,
              text: (
                <>
                  หมดอายุ {formatExpiry(dealExpiry(draft.moveInDate))} —<br />
                  ส่วนที่ยังไม่ปล่อยคืนผู้เช่าอัตโนมัติ
                </>
              ),
            },
            { icon: UserCheck, text: "ยกเลิกได้เมื่อทั้งสองฝ่ายยินยอม" },
            { icon: Lock, text: "คุณถอนเงินเองไม่ได้ ปล่อยได้ด้วยการกดของผู้เช่าเท่านั้น" },
          ]}
        />
      </section>
    </AppShell>
  );
}
