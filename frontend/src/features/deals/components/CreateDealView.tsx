"use client";

import { Building2, Calendar, ChevronRight, House, KeyRound, Pencil, Wallet } from "lucide-react";
import { useId, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SplitBar } from "@/components/ui/SplitBar";
import { StepTabs } from "@/components/ui/StepTabs";
import { TrancheRow } from "@/components/ui/TrancheRow";
import { formatDate, formatDayMonthTime, fromBangkokInputValue, toBangkokInputValue } from "@/lib/format/date";
import { bahtToSatang, formatBaht } from "@/lib/format/money";
import type { PropertyDTO } from "@/types/api";
import { dealDraftSchema, type DealDraft } from "../schema";

export const DEAL_STEPS = ["รายละเอียดดีล", "ตรวจสอบและส่ง"];

type CreateDealViewProps = {
  draft: DealDraft;
  property: PropertyDTO;
  onChange?: (patch: Partial<DealDraft>) => void;
  onNext?: () => void;
};

const parseBaht = (text: string) => Number(text.replace(/[^\d]/g, "") || 0);

/** L2 — สร้างดีล ขั้นที่ 1 รายละเอียดดีล */
export function CreateDealView({ draft, property, onChange, onNext }: CreateDealViewProps) {
  const ids = { amount: useId(), viewing: useId(), moveIn: useId(), booking: useId() };
  const [editingFee, setEditingFee] = useState(false);
  const [feeText, setFeeText] = useState("");

  const parsed = dealDraftSchema.safeParse(draft);
  const errors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));
  const mainDeposit = draft.totalSatang - draft.bookingFeeSatang;

  const openFeeEditor = () => {
    setFeeText(formatBaht(draft.bookingFeeSatang));
    setEditingFee(true);
  };

  return (
    <AppShell
      background={<ScreenBackground screen="L2" />}
      header={
        <>
          <AppHeader title="สร้างดีล K Sure" left="back" right="menu" />
          <StepTabs steps={DEAL_STEPS} current={0} />
        </>
      }
      footer={
        <StickyFooter>
          <Button disabled={!parsed.success} onClick={onNext} iconRight={<ChevronRight size={17} strokeWidth={1.77} />}>
            ถัดไป
          </Button>
        </StickyFooter>
      }
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-muted">ประเภทดีล</span>
          <span className="inline-flex h-[27px] items-center gap-[5px] rounded-full bg-neon/12 px-3 text-meta font-semibold text-neon">
            <House size={13} strokeWidth={1.5} />
            มัดจำห้องเช่า
          </span>
        </div>

        <FormField label="ห้อง / โครงการ" icon={<Building2 size={17} strokeWidth={1.42} />}>
          <span className="truncate text-input">
            {property.propertyType} {property.projectName} · {property.unitNo}
          </span>
        </FormField>

        <FormField
          label="ยอดเงินมัดจำรวม"
          htmlFor={ids.amount}
          icon={<Wallet size={18} strokeWidth={1.5} />}
          suffix="บาท"
          large
          active
        >
          <input
            id={ids.amount}
            inputMode="numeric"
            autoComplete="off"
            value={draft.totalSatang ? formatBaht(draft.totalSatang) : ""}
            onChange={(e) => onChange?.({ totalSatang: bahtToSatang(parseBaht(e.target.value)) })}
            aria-invalid={Boolean(errors.totalSatang)}
            className="w-full bg-transparent text-amount-input text-white tabular-nums outline-none placeholder:text-muted"
            placeholder="0"
          />
        </FormField>
        {errors.totalSatang && <p className="-mt-1 text-caption text-danger">{errors.totalSatang}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="นัดดูห้อง" htmlFor={ids.viewing} icon={<Calendar size={16} strokeWidth={1.5} />}>
            <span className="pointer-events-none truncate text-input">{formatDayMonthTime(draft.viewingAt)}</span>
            {/* native picker โปร่งใสทับข้อความ — แตะแล้วเปิดตัวเลือกวันเวลาของเครื่อง */}
            <input
              id={ids.viewing}
              type="datetime-local"
              value={toBangkokInputValue(draft.viewingAt)}
              onChange={(e) => e.target.value && onChange?.({ viewingAt: fromBangkokInputValue(e.target.value) })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </FormField>
          <FormField label="วันเข้าอยู่" htmlFor={ids.moveIn} icon={<KeyRound size={16} strokeWidth={1.5} />}>
            <span className="pointer-events-none truncate text-input">
              {formatDate(`${draft.moveInDate}T00:00:00+07:00`)}
            </span>
            <input
              id={ids.moveIn}
              type="date"
              value={draft.moveInDate}
              onChange={(e) => e.target.value && onChange?.({ moveInDate: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </FormField>
        </div>
        {errors.moveInDate && <p className="-mt-1 text-caption text-danger">{errors.moveInDate}</p>}
      </section>

      <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-section">แบ่งการปล่อยเงิน</h2>
          <button
            type="button"
            onClick={openFeeEditor}
            className="inline-flex h-[22px] items-center gap-1 rounded-full bg-neon/12 px-2.5 text-badge text-neon"
          >
            <Pencil size={11} strokeWidth={1.1} />
            ปรับยอด
          </button>
        </div>
        <SplitBar first={draft.bookingFeeSatang} total={draft.totalSatang} />
        <TrancheRow
          index={1}
          highlight
          title="ค่าจอง"
          description="ปล่อยเมื่อผู้เช่ายืนยันว่าดูห้องแล้ว"
          amount={formatBaht(draft.bookingFeeSatang)}
        />
        <TrancheRow
          index={2}
          title="มัดจำหลัก"
          description="ปล่อยเมื่อผู้เช่ายืนยันว่าเข้าอยู่แล้ว"
          amount={formatBaht(Math.max(0, mainDeposit))}
        />
        {errors.bookingFeeSatang && <p className="text-caption text-danger">{errors.bookingFeeSatang}</p>}
      </section>

      <BottomSheet open={editingFee} onClose={() => setEditingFee(false)} title="ปรับยอดค่าจอง">
        <div className="flex flex-col gap-4">
          <FormField label="ค่าจอง (ปล่อยเมื่อดูห้องแล้ว)" htmlFor={ids.booking} suffix="บาท" large active>
            <input
              id={ids.booking}
              inputMode="numeric"
              autoFocus
              value={feeText}
              onChange={(e) => {
                const baht = parseBaht(e.target.value);
                setFeeText(baht ? formatBaht(bahtToSatang(baht)) : "");
              }}
              className="w-full bg-transparent text-amount-input text-white tabular-nums outline-none"
            />
          </FormField>
          <p className="text-caption text-muted">
            มัดจำหลักจะเป็นยอดที่เหลือ: {formatBaht(Math.max(0, draft.totalSatang - bahtToSatang(parseBaht(feeText))))}{" "}
            บาท
          </p>
          <Button
            onClick={() => {
              onChange?.({ bookingFeeSatang: bahtToSatang(parseBaht(feeText)) });
              setEditingFee(false);
            }}
          >
            บันทึก
          </Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
