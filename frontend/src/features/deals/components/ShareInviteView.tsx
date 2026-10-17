"use client";

import { BadgeCheck, ChevronRight, Download, Search, Send, ShieldCheck, Smartphone, ScanLine } from "lucide-react";
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
  onSend?: (phone?: string) => void;
  onSaveQr?: () => void;
  onLookup?: (phone: string) => Promise<string>;
};

export function ShareInviteView({
  deal,
  inviteUrl,
  sending,
  onClose,
  onSend,
  onSaveQr,
  onLookup,
}: ShareInviteViewProps) {
  const [tab, setTab] = useState<"qr" | "phone">("qr");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<{ phone: string; shortName: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const byPhone = tab === "phone";
  const phoneReady = found !== null && found.phone === phone;

  const lookup = async () => {
    if (!onLookup) return;
    setLooking(true);
    setLookupError(null);
    try {
      setFound({ phone, shortName: await onLookup(phone) });
    } catch (err) {
      setFound(null);
      setLookupError(err instanceof Error ? err.message : "ไม่พบผู้เช่าที่ใช้เบอร์นี้");
    } finally {
      setLooking(false);
    }
  };

  return (
    <AppShell
      enter="modal"
      background={<ScreenBackground screen="L4" />}
      header={<AppHeader title="ส่งคำขอให้ผู้เช่า" left="close" right="menu" onLeft={onClose} />}
      footer={
        <StickyFooter>
          <Button
            loading={sending}
            disabled={byPhone && !phoneReady}
            onClick={() => onSend?.(byPhone ? phone : undefined)}
            iconLeft={<Send size={18} strokeWidth={1.65} />}
            iconRight={<ChevronRight size={17} strokeWidth={1.77} />}
          >
            {byPhone && found ? `ส่งให้ ${found.shortName}` : "ส่งเข้าแอปผู้เช่า"}
          </Button>
          {!byPhone && (
            <Button variant="secondary" onClick={onSaveQr} iconLeft={<Download size={18} strokeWidth={1.65} />}>
              บันทึก QR
            </Button>
          )}
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
        <section data-export="qr" className="flex flex-col gap-2.5 rounded-card bg-card p-4">
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
        <section className="flex flex-col gap-3 rounded-card bg-card p-4">
          <p className="text-card-title">ส่งด้วยเบอร์มือถือผู้เช่า</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void lookup();
            }}
          >
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="08x-xxx-xxxx"
              aria-label="เบอร์มือถือผู้เช่า"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, "").slice(0, 12))}
              className="h-12 min-w-0 flex-1 rounded-tile border border-line bg-card2 px-4 text-body text-white tabular-nums outline-none placeholder:text-muted focus:border-neon/55"
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-auto px-4"
              loading={looking}
              disabled={phone.replace(/\D/g, "").length !== 10}
              iconLeft={<Search size={16} strokeWidth={1.6} />}
            >
              ค้นหา
            </Button>
          </form>
          {found && found.phone === phone && (
            <div className="flex items-center justify-between rounded-tile bg-card2 px-4 py-3">
              <span className="text-body-strong">{found.shortName}</span>
              <span className="flex items-center gap-1 text-caption text-neon">
                <BadgeCheck size={14} strokeWidth={1.6} />
                ชื่อตรงบัญชี
              </span>
            </div>
          )}
          {lookupError && <p className="text-caption text-warn">{lookupError}</p>}
          <p className="text-caption text-muted">เดโม: ผู้เช่าใช้เบอร์ 089-000-1432</p>
        </section>
      )}

      <InfoNote icon={<ShieldCheck size={17} strokeWidth={1.5} />}>
        {brand.name} ไม่ส่งลิงก์ทาง SMS / LINE และไม่ขอ OTP —<br />
        ผู้เช่าเปิดคำขอได้ในแอป {brand.hostAppName} เท่านั้น
      </InfoNote>
    </AppShell>
  );
}
