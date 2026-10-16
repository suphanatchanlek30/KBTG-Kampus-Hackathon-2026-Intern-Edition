"use client";

import { CircleCheck, Lock, RotateCcw, ScanFace, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { HeroCircle } from "@/components/ui/HeroCircle";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/format/money";

export type ScanPhase = "scanning" | "success" | "error";

type LockViewProps = {
  amountSatang: number;
  accountType: string;
  accountNoMasked: string;
  phase: ScanPhase;
  onClose?: () => void;
  onUsePin?: () => void;
  onRetry?: () => void;
};

const STATUS: Record<ScanPhase, string> = {
  scanning: "กำลังสแกนใบหน้า…",
  success: "ยืนยันตัวตนสำเร็จ",
  error: "ยืนยันไม่สำเร็จ ลองอีกครั้ง",
};

/**
 * T3 — ยืนยันการกันเงินด้วย Face ID จำลอง
 * ไม่เปิดกล้อง ไม่ใช้ WebAuthn ไม่เก็บข้อมูลใบหน้า — เป็นอนิเมชันล้วน (docs/02-ui-spec.md §5.2)
 */
export function LockView({
  amountSatang,
  accountType,
  accountNoMasked,
  phase,
  onClose,
  onUsePin,
  onRetry,
}: LockViewProps) {
  return (
    <AppShell
      background={<ScreenBackground screen="T3" />}
      header={<AppHeader title="ยืนยันการกันเงิน" left="close" right="menu" onLeft={onClose} />}
      footer={
        <div className="flex h-[60px] items-start justify-center px-5 pt-[18px] framed:pb-0">
          <Button variant="link" className="text-section" onClick={onUsePin}>
            ใช้รหัส PIN แทน
          </Button>
        </div>
      }
      className="flex flex-col items-center gap-3 px-5 pt-1 pb-2"
    >
      <div className="pt-2 pb-1.5">
        <HeroCircle size={84}>
          <ShieldCheck size={38} strokeWidth={2.2} />
        </HeroCircle>
      </div>

      <div className="flex flex-col items-center">
        <h2 className="text-title">ยืนยันการกันเงิน</h2>
        <p className="pt-1 text-body text-gray">ด้วย Face ID</p>
      </div>

      <section className="flex w-full flex-col items-center gap-1 rounded-card bg-white p-4 text-center">
        <p className="text-caption text-ink-2">ยอดที่จะกันไว้กับ {brand.name}</p>
        <p className="text-amount-hero text-ink-green tabular-nums">{formatBaht(amountSatang, 2)}</p>
        <p className="text-caption text-ink-2">
          จากบัญชี{accountType} {accountNoMasked}
        </p>
        <div className="w-full pt-2">
          <p className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-mint-pale px-2.5 text-caption font-medium text-parsley">
            <Lock size={13} strokeWidth={1.6} />
            เงินยังอยู่ในบัญชีคุณ แต่ใช้จ่ายไม่ได้จนกว่าดีลจะจบ
          </p>
        </div>
      </section>

      <div className="pt-3.5">
        <div
          className={cn(
            "flex size-24 items-center justify-center rounded-[30px] border bg-card transition-colors",
            phase === "scanning" && "border-neon/35 text-white",
            phase === "success" && "border-neon text-neon",
            phase === "error" && "border-danger text-danger",
          )}
        >
          {phase === "success" ? (
            <CircleCheck size={50} strokeWidth={1.4} />
          ) : (
            <ScanFace size={50} strokeWidth={1.4} className={phase === "scanning" ? "motion-safe:animate-pulse" : ""} />
          )}
        </div>
      </div>
      <p
        role="status"
        className={cn(
          "text-caption",
          phase === "error" ? "text-danger" : phase === "success" ? "text-neon" : "text-muted",
        )}
      >
        {STATUS[phase]}
      </p>
      {phase === "error" && (
        <Button variant="secondary" className="w-auto px-6" iconLeft={<RotateCcw size={16} />} onClick={onRetry}>
          ลองอีกครั้ง
        </Button>
      )}
    </AppShell>
  );
}
