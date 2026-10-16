import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { HomeHeader } from "@/components/ui/HomeHeader";
import { brand } from "@/config/brand";

// Phase 1 placeholder — Phase 2/7 จะเปลี่ยนเป็น redirect → /home หรือ /login (docs/03-architecture.md §3.1)
export default function Page() {
  return (
    <PhoneFrame>
      <AppShell
        header={<HomeHeader greeting="สวัสดีตอนเช้า" name="คุณสมชาย ใจดี" notificationCount={1} />}
        footer={<BottomNav active="home" notificationCount={1} />}
        indicatorClassName="bg-nav"
        className="flex flex-col gap-3 px-5 pt-1 pb-2"
      >
        <Card variant="outline-neon" className="gap-2 p-5">
          <ShieldCheck className="text-neon" size={28} strokeWidth={1.8} />
          <p className="text-promo-title">
            มัดจำห้อง <span className="text-highlight">{brand.taglineHighlight}</span>
          </p>
          <p className="text-body text-gray">Frontend foundation พร้อมแล้ว — หน้าจอจริงจะมาใน Phase 2</p>
        </Card>
        <Card>
          <p className="text-card-title">เครื่องมือสำหรับนักพัฒนา</p>
          <Link href="/dev/components" className="text-body text-neon underline underline-offset-4">
            /dev/components — แคตตาล็อก component
          </Link>
          <Link href="/dev/overlay?screen=L1" className="text-body text-neon underline underline-offset-4">
            /dev/overlay — วาง mockup ทับหน้าจริง
          </Link>
        </Card>
        <DemoBadge className="md:hidden" />
      </AppShell>
    </PhoneFrame>
  );
}
