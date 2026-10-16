"use client";

import { ChevronRight, Download, Send, ShieldCheck, Smartphone, ScanLine } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { DrawnCheck } from "@/components/motion/DrawnCheck";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { InfoNote } from "@/components/ui/InfoNote";
import { QrCard } from "@/components/ui/QrCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { brand } from "@/config/brand";
import { formatDateTime } from "@/lib/format/date";
import type { DealDTO } from "@/types/api";

type ShareInviteViewProps = {
  deal: DealDTO;
  inviteUrl: string;
  sending?: boolean;
  onClose?: () => void;
  onSend?: () => void;
  onSaveQr?: () => void;
};

/** L4 — ส่งคำขอให้ผู้เช่า (QR / รหัสดีล) · แท็บเบอร์มือถือ = D10 (ยังไม่ได้ออกแบบ) */
export function ShareInviteView({ deal, inviteUrl, sending, onClose, onSend, onSaveQr }: ShareInviteViewProps) {
  const [tab, setTab] = useState<"qr" | "phone">("qr");

  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen="L4" />}
      header={<AppHeader title="ส่งคำขอให้ผู้เช่า" left="close" right="menu" onLeft={onClose} />}
      footer={
        <StickyFooter>
          <Button
            loading={sending}
            onClick={onSend}
            iconLeft={<Send size={18} strokeWidth={1.65} />}
            iconRight={<ChevronRight size={17} strokeWidth={1.77} />}
          >
            ส่งเข้าแอปผู้เช่า
          </Button>
          <Button variant="secondary" onClick={onSaveQr} iconLeft={<Download size={18} strokeWidth={1.65} />}>
            บันทึก QR
          </Button>
        </StickyFooter>
      }
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      <SegmentedControl
        aria-label="วิธีส่งคำขอ"
        value={tab}
        onChange={setTab}
        segments={[
          { value: "qr", label: "QR Code", icon: <ScanLine size={15} strokeWidth={1.5} /> },
          { value: "phone", label: "เบอร์มือถือผู้เช่า", icon: <Smartphone size={15} strokeWidth={1.5} /> },
        ]}
      />

      {tab === "qr" ? (
        <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-body font-semibold text-neon">
              <DrawnCheck size={15} strokeWidth={2} delay={0.3} />
              สร้างคำขอแล้ว
            </span>
            <span className="text-micro text-muted">{deal.refNo}</span>
          </div>
          <QrCard value={inviteUrl} />
          <p className="text-center text-body-strong">ให้ผู้เช่าสแกนด้วยแอป {brand.hostAppName}</p>
          <CodeField label="รหัสดีล" code={deal.shareCode} />
          {deal.invite && (
            <p className="text-center text-caption text-sage">ใช้ได้ถึง {formatDateTime(deal.invite.expiresAt)}</p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-2 rounded-card bg-card p-4">
          {/* D10 — รออนุมัติดีไซน์ (docs/01-user-flow.md §7) */}
          <p className="text-card-title">ส่งด้วยเบอร์มือถือผู้เช่า</p>
          <p className="text-body text-gray">หน้าจอนี้ (D10) ยังรอออกแบบ — ระหว่างนี้กด “ส่งเข้าแอปผู้เช่า” ได้เลย</p>
        </section>
      )}

      <InfoNote icon={<ShieldCheck size={17} strokeWidth={1.5} />}>
        {brand.name} ไม่ส่งลิงก์ทาง SMS / LINE และไม่ขอ OTP —<br />
        ผู้เช่าเปิดคำขอได้ในแอป {brand.hostAppName} เท่านั้น
      </InfoNote>
    </AppShell>
  );
}
