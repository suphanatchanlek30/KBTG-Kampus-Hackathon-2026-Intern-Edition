"use client";

import { Check, ChevronRight, House, Key, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { CheckList } from "@/components/ui/CheckList";
import { HeroCircle } from "@/components/ui/HeroCircle";
import { InfoNote } from "@/components/ui/InfoNote";
import { ReleaseRow } from "@/components/ui/ReleaseRow";
import { Stepper3 } from "@/components/ui/Stepper3";
import { formatDate, formatExpiry } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO } from "@/types/api";

export type ReleaseKind = "viewing" | "move-in";

export const CHECKLISTS: Record<ReleaseKind, string[]> = {
  viewing: ["ได้ดูห้องจริงแล้ว", "ห้องตรงกับเลขห้องและรายละเอียดในดีล", "ผู้ให้เช่าเป็นคนเดียวกับในดีล"],
  "move-in": ["ได้รับกุญแจ / คีย์การ์ดแล้ว", "เข้าห้องและใช้งานได้จริง", "ทำสัญญาเช่าเรียบร้อย"],
};

type ConfirmReleaseViewProps = {
  kind: ReleaseKind;
  deal: DealDTO;
  checked: boolean[];
  submitting?: boolean;
  onToggle?: (index: number) => void;
  onBack?: () => void;
  onConfirm?: () => void;
  onNotReady?: () => void;
};

/** T5 ยืนยันดูห้อง (ปล่อยค่าจอง) · T6 ยืนยันเข้าอยู่ (ปล่อยมัดจำหลัก) — ปุ่มหลักกดได้เมื่อติ๊กครบ */
export function ConfirmReleaseView({
  kind,
  deal,
  checked,
  submitting,
  onToggle,
  onBack,
  onConfirm,
  onNotReady,
}: ConfirmReleaseViewProps) {
  const { amounts, landlord } = deal;
  const allChecked = checked.length === CHECKLISTS[kind].length && checked.every(Boolean);
  const payee = `ให้ ${landlord.shortName} (${landlord.accountNoMasked})`;
  const viewing = kind === "viewing";
  const bookingReleasedAt = deal.tranches.find((t) => t.key === "BOOKING_FEE")?.releasedAt;

  return (
    <AppShell
      enter="push"
      background={<ScreenBackground screen={viewing ? "T5" : "T6"} />}
      header={
        <AppHeader title={viewing ? "ยืนยันการดูห้อง" : "ยืนยันการเข้าอยู่"} left="back" right="menu" onLeft={onBack} />
      }
      footer={
        <StickyFooter>
          <Button
            disabled={!allChecked}
            loading={submitting}
            onClick={onConfirm}
            iconRight={<ChevronRight size={17} strokeWidth={1.77} />}
          >
            {viewing
              ? `ปล่อยค่าจอง ${formatBaht(amounts.bookingFeeSatang)}`
              : `ปล่อยมัดจำหลัก ${formatBaht(amounts.mainDepositSatang)}`}
          </Button>
          <Button variant="secondary" onClick={onNotReady}>
            {viewing ? "ยังไม่พร้อม / ห้องไม่ตรง" : "ยังไม่ได้เข้าอยู่"}
          </Button>
        </StickyFooter>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      {!viewing && (
        <div className="w-full">
          <Stepper3 statuses={["done", "done", "current"]} delay={0.1}>
            {bookingReleasedAt && (
              <p className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-neon/12 px-2.5 text-caption font-medium text-neon">
                <Check size={13} strokeWidth={2} />
                ปล่อยค่าจอง {formatBaht(amounts.bookingFeeSatang)} แล้ว · {formatExpiry(bookingReleasedAt)}
              </p>
            )}
          </Stepper3>
        </div>
      )}

      <div className="pt-2 pb-1.5">
        <HeroCircle size={64}>
          {viewing ? <House size={28} strokeWidth={2.2} /> : <Key size={28} strokeWidth={2.2} />}
        </HeroCircle>
      </div>

      <div className="flex flex-col items-center text-center">
        <h2 className="text-title-sm">
          {viewing ? "ดูห้องเรียบร้อยแล้วใช่ไหม?" : "ได้รับกุญแจและเข้าอยู่แล้วใช่ไหม?"}
        </h2>
        <p className="pt-1 text-body text-gray">
          {viewing
            ? "ถ้าห้องตรงตามที่ตกลง คุณปล่อยค่าจองให้ผู้ให้เช่าได้"
            : "กดเมื่อเข้าอยู่จริงเท่านั้น เงินก้อนนี้จะถึงผู้ให้เช่าทันที"}
        </p>
      </div>

      <div className="w-full">
        <CheckList items={CHECKLISTS[kind]} checked={checked} onToggle={onToggle} />
      </div>

      <section className="flex w-full flex-col gap-2.5 rounded-card bg-card p-4">
        {viewing ? (
          <>
            <ReleaseRow
              highlight
              label="จะปล่อยตอนนี้ · ค่าจอง"
              title={payee}
              amount={formatBaht(amounts.bookingFeeSatang)}
            />
            <ReleaseRow
              label="ยังกันไว้ · มัดจำหลัก"
              title={`จนกว่าคุณจะเข้าอยู่ ${formatDate(`${deal.moveInDate}T00:00:00+07:00`)}`}
              amount={formatBaht(amounts.mainDepositSatang)}
            />
          </>
        ) : (
          <ReleaseRow
            large
            label="จะปล่อยตอนนี้ · มัดจำหลัก"
            title={payee}
            amount={formatBaht(amounts.mainDepositSatang)}
          />
        )}
      </section>

      {viewing && (
        <InfoNote tone="warn" className="w-full" icon={<TriangleAlert size={16} strokeWidth={1.6} />}>
          ถ้ามีคนเร่งให้กดก่อนได้ดูห้อง อย่ากด — เงินยังปลอดภัย
          <br />
          และจะคืนคุณอัตโนมัติเมื่อหมดเวลา
        </InfoNote>
      )}
    </AppShell>
  );
}
