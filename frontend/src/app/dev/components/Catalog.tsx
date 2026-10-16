"use client";

import { ArrowRight, Calendar, Check, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomNav } from "@/components/ui/BottomNav";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { HomeHeader } from "@/components/ui/HomeHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { formatBaht } from "@/lib/format/money";

// แคตตาล็อกทุก component ทุก variant — ใช้ตรวจสี/ขนาดเทียบ Foundations (docs/design/foundations.png)

const COLORS = [
  ["bg", "bg-bg", "#0A0A0B"],
  ["card", "bg-card", "#16181C"],
  ["card2", "bg-card2", "#1F2227"],
  ["line", "bg-line", "#2A2E35"],
  ["white", "bg-white", "#FFFFFF"],
  ["gray", "bg-gray", "#B4B8BE"],
  ["muted", "bg-muted", "#7A7F87"],
  ["neon", "bg-neon", "#5DF591"],
  ["mint", "bg-mint", "#BEFEC2"],
  ["parsley", "bg-parsley", "#1F6A1A"],
  ["warn", "bg-warn", "#FFB800"],
  ["danger", "bg-danger", "#FF4D4F"],
  ["nav", "bg-nav", "#111214"],
  ["stroke", "bg-stroke", "#3A3E45"],
  ["ink-2", "bg-ink-2", "#5B6068"],
  ["ink-mint", "bg-ink-mint", "#2A3B30"],
  ["divider-light", "bg-divider-light", "#E6E8EB"],
  ["sheet-list", "bg-sheet-list", "#F4F5F7"],
  ["warn-soft", "bg-warn-soft", "#FFF4D6"],
  ["warn-text", "bg-warn-text", "#FFD978"],
] as const;

const TYPE_SCALE = [
  ["amount-hero", "text-amount-hero tabular-nums", formatBaht(650_000, 2)],
  ["amount-balance", "text-amount-balance tabular-nums", formatBaht(4_285_000, 2)],
  ["amount-lg", "text-amount-lg", formatBaht(650_000)],
  ["amount-input", "text-amount-input", formatBaht(100_000)],
  ["amount-md", "text-amount-md", formatBaht(550_000)],
  ["title", "text-title", "ได้รับเงินครบแล้ว"],
  ["title-sm", "text-title-sm", "ดูห้องเรียบร้อยแล้วใช่ไหม?"],
  ["greeting-name", "text-greeting-name", "คุณสมชาย ใจดี"],
  ["sheet-title", "text-sheet-title", "หยุดก่อน! นี่อาจเป็นการขอเงินนอกดีล"],
  ["promo-title", "text-promo-title", "มัดจำห้อง แบบไม่ต้องลุ้น"],
  ["header / button", "text-header", "สร้างดีล K Sure"],
  ["code", "text-code", "KS-8F4Q21"],
  ["section", "text-section", "บริการแนะนำ"],
  ["body-strong", "text-body-strong", "ตรวจสอบคำขอ"],
  ["input", "text-input", "คอนโด The Park สุขุมวิท 64"],
  ["row-title", "text-row-title", "นัดดูห้อง"],
  ["check-item", "text-check-item", "ห้องตรงกับรายละเอียดในดีล"],
  ["card-title", "text-card-title", "กติกาของดีลนี้"],
  ["body", "text-body", "ผู้เช่ากันเงินไว้ในบัญชีตัวเอง ใช้จ่ายไม่ได้ชั่วคราว"],
  ["meta", "text-meta", "เข้าบัญชีออมทรัพย์ xxx-x-x4821"],
  ["caption", "text-caption", "ยอดเงินที่ใช้ได้"],
  ["service-label", "text-service-label", "โอนเงิน"],
  ["badge", "text-badge", "กำลังดำเนินการ"],
  ["micro", "text-micro", "14 ต.ค. 2569 · 10:31"],
  ["eyebrow", "text-eyebrow", "FUNDS SECURED"],
  ["nav-label", "text-nav-label", "หน้าหลัก"],
  ["count", "text-count", "1"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-line pb-2 text-section text-gray">{title}</h2>
      {children}
    </section>
  );
}

/** กล่องกว้าง 393 เท่าจอ mockup */
function PhoneWidth({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-[393px] max-w-full overflow-hidden rounded-2xl border border-line bg-bg ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function Catalog() {
  const [sheet, setSheet] = useState<"light" | "dark" | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">Component catalog</h1>
        <DemoBadge />
      </header>

      <Section title="สี (@theme)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {COLORS.map(([name, cls, hex]) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`size-10 shrink-0 rounded-xl border border-white/10 ${cls}`} />
              <span className="flex flex-col">
                <span className="text-body-strong">{name}</span>
                <span className="text-micro text-muted">{hex}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-card-xl bg-grad-mint shadow-mint" title="bg-grad-mint" />
          <div className="h-20 rounded-card-xl border border-neon/35 bg-grad-request" title="bg-grad-request" />
          <div className="relative h-20 overflow-hidden rounded-card-xl bg-card">
            <div className="absolute -inset-10 bg-glow-hero" title="bg-glow-hero" />
          </div>
        </div>
      </Section>

      <Section title="Typography (Poppins + Noto Sans Thai)">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map(([name, cls, sample]) => (
            <div key={name} className="flex flex-wrap items-baseline gap-x-4">
              <code className="w-32 shrink-0 text-micro text-muted">{name}</code>
              <span className={cls}>{sample}</span>
            </div>
          ))}
          <p className="text-promo-title">
            มัดจำห้อง <span className="text-highlight">แบบไม่ต้องลุ้น</span>
          </p>
        </div>
      </Section>

      <Section title="Button">
        <PhoneWidth className="flex flex-col gap-2.5 p-5">
          <Button iconRight={<ArrowRight size={17} strokeWidth={1.77} />}>ถัดไป</Button>
          <Button variant="secondary">ยังไม่พร้อม / ห้องไม่ตรง</Button>
          <Button iconLeft={<Calendar size={18} strokeWidth={1.65} />}>เพิ่มนัดดูห้องลงปฏิทิน</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            กดเพื่อดู loading
          </Button>
          <Button disabled>ยืนยันการเข้าอยู่ (disabled)</Button>
          <div className="rounded-card bg-white p-4">
            <Button variant="dark">กลับไปที่ดีล</Button>
          </div>
          <Button variant="link" className="self-center">
            ใช้รหัส PIN แทน
          </Button>
        </PhoneWidth>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neon">
            <Check size={11} strokeWidth={1.47} />
            ชื่อตรงบัญชี
          </Badge>
          <Badge variant="neon-soft">ค่าธรรมเนียม 0 บาท</Badge>
          <Badge variant="warn-soft">กำลังดำเนินการ</Badge>
          <span className="rounded-xl bg-grad-mint p-2">
            <Badge variant="dark">หลัก</Badge>
          </span>
          <Badge variant="new">ใหม่</Badge>
          <Badge variant="count">1</Badge>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-card-title">default (card)</p>
            <p className="text-body text-gray">การ์ดหลัก — ไทม์ไลน์, ฟอร์ม, กติกา</p>
          </Card>
          <Card variant="raised">
            <p className="text-card-title">raised (card2)</p>
            <p className="text-body text-gray">input, ช่องบริการ, การ์ดซ้อน</p>
          </Card>
          <Card variant="mint">
            <p className="text-eyebrow text-parsley">FUNDS SECURED</p>
            <p className="text-amount-lg text-ink">{formatBaht(650_000)}</p>
          </Card>
          <Card variant="white">
            <p className="text-card-title">white (การ์ดหลักฐาน)</p>
            <p className="text-body text-ink-2">หลักฐานดีล</p>
          </Card>
          <Card variant="outline-neon" className="sm:col-span-2">
            <p className="text-promo-title">outline-neon (การ์ดคำขอ / แบนเนอร์)</p>
          </Card>
        </div>
      </Section>

      <Section title="Header / Nav">
        <div className="flex flex-wrap gap-4">
          <PhoneWidth>
            <HomeHeader greeting="สวัสดีตอนเช้า" name="คุณสมชาย ใจดี" notificationCount={1} />
            <AppHeader title="สร้างดีล K Sure" left="back" onLeft={() => toast.success("ย้อนกลับ")} />
            <AppHeader title="สถานะดีล" left="back" right="share" onLeft={() => {}} />
            <AppHeader title="ส่งคำขอ" left="close" right="menu" onLeft={() => {}} />
            <BottomNav active="home" notificationCount={1} />
          </PhoneWidth>
        </div>
      </Section>

      <Section title="Bottom sheet / Toast / Skeleton">
        <PhoneWidth className="flex flex-col gap-2.5 p-5">
          <Button variant="secondary" onClick={() => setSheet("light")}>
            เปิด sheet light (T8)
          </Button>
          <Button variant="secondary" onClick={() => setSheet("dark")}>
            เปิด sheet dark (D4/D5/D11)
          </Button>
          <Button variant="secondary" onClick={() => toast.success("คัดลอกแล้ว")}>
            toast สำเร็จ
          </Button>
          <Button variant="secondary" onClick={() => toast.error("ยอดเงินไม่พอ")}>
            toast error
          </Button>
          <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-[187px] rounded-card-xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </PhoneWidth>
      </Section>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        tone={sheet ?? "dark"}
        title={sheet === "light" ? "หยุดก่อน! นี่อาจเป็นการขอเงินนอกดีล" : "ยังไม่ได้เข้าอยู่?"}
      >
        <div className="flex flex-col gap-3">
          <p className={sheet === "light" ? "text-body text-ink-2" : "text-body text-gray"}>
            ลากลงเพื่อปิด หรือแตะพื้นหลัง / กด Esc
          </p>
          <Button
            variant={sheet === "light" ? "dark" : "primary"}
            iconLeft={<Send size={16} />}
            onClick={() => setSheet(null)}
          >
            เข้าใจแล้ว
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
