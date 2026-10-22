"use client";

import { Download } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { CountUp } from "@/components/motion/CountUp";
import { useEnter } from "@/components/motion/MotionMode";
import { SuccessHero } from "@/components/motion/SuccessHero";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { StepperRow } from "@/components/ui/Stepper3";
import { brand } from "@/config/brand";
import { formatDateTime } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { AccountDTO, DealDTO } from "@/types/api";
import { ReceiptCard, type ReceiptField, type ReceiptLine } from "./ReceiptCard";

type CompleteViewProps = {
  deal: DealDTO;
  account: Pick<AccountDTO, "accountType" | "accountNoMasked">;
  onClose?: () => void;
  onShare?: () => void;
  onDone?: () => void;
  onSaveProof?: () => void;
};

export function CompleteView({ deal, account, onClose, onShare, onDone, onSaveProof }: CompleteViewProps) {
  const enter = useEnter();
  const tenantSide = deal.myRole === "TENANT";
  const { amounts, property, landlord, tenant } = deal;

  const lines: ReceiptLine[] = deal.tranches.map((t) => ({
    key: t.key,
    title: t.key === "BOOKING_FEE" ? "ค่าจอง" : "มัดจำหลัก",
    detail: t.releasedAt ? formatDateTime(t.releasedAt) : "—",
    amount: formatBaht(t.amountSatang),
  }));

  const fields: ReceiptField[] = tenantSide
    ? [
        { label: "ถึง", value: `${landlord.displayName} · ${landlord.accountNoMasked}` },
        { label: "เลขอ้างอิง", value: deal.refNo },
      ]
    : [
        { label: "จาก", value: `${tenant?.shortName ?? "-"} (ผู้เช่า)` },
        { label: "ห้อง", value: `${property.projectName} · ${property.unitNo}` },
        { label: "เลขอ้างอิง", value: deal.refNo },
        { label: "ค่าธรรมเนียม", value: `${formatBaht(amounts.feeSatang, 2)} บาท` },
      ];

  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen={tenantSide ? "T7" : "L6"} hero={{ size: 92 }} />}
      header={<AppHeader left="close" right="share" onLeft={onClose} onRight={onShare} />}
      footer={
        <motion.div {...enter(1.1, { y: 16, duration: 0.35 })}>
          <StickyFooter>
            <Button onClick={onDone}>เสร็จสิ้น</Button>
            <Button variant="secondary" onClick={onSaveProof} iconLeft={<Download size={18} strokeWidth={1.65} />}>
              {tenantSide ? "ดาวน์โหลดหลักฐาน" : "บันทึกหลักฐาน"}
            </Button>
          </StickyFooter>
        </motion.div>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      <div className="pt-2 pb-1.5">
        <SuccessHero icon="check" size={92} />
      </div>
      <motion.h2 className="text-title" {...enter(0.55)}>
        {tenantSide ? "ปล่อยเงินเรียบร้อยแล้ว" : "ได้รับเงินครบแล้ว"}
      </motion.h2>
      <motion.p className="text-amount-hero text-neon" {...enter(0.65)}>
        <CountUp satang={tenantSide ? amounts.mainDepositSatang : amounts.releasedSatang} delay={0.65} />
      </motion.p>
      <motion.p className="text-meta text-gray" {...enter(0.75)}>
        {tenantSide
          ? `ดีลเสร็จสมบูรณ์ · ปล่อยครบ ${formatBaht(amounts.totalSatang)}`
          : `เข้าบัญชี${account.accountType} ${account.accountNoMasked}`}
      </motion.p>

      <ReceiptCard
        header={
          tenantSide ? (
            <>
              <StepperRow statuses={["done", "done", "done"]} tone="light" delay={1} />
              <hr className="border-divider-light" />
            </>
          ) : (
            <div className="flex h-[21px] items-center justify-between">
              <Image
                src={brand.logo.src}
                alt={brand.name}
                width={70}
                height={22}
                className="h-[22px] w-[70px]"
                loading="eager"
              />
              <span className="text-micro text-ink-2">หลักฐานดีล</span>
            </div>
          )
        }
        lines={lines}
        fields={fields}
      />
    </AppShell>
  );
}
