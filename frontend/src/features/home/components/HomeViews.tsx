import { AppShell } from "@/components/layout/AppShell";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { BottomNav } from "@/components/ui/BottomNav";
import { HomeHeader } from "@/components/ui/HomeHeader";
import type { HomeDTO } from "@/types/api";
import { ActiveDealCard } from "./ActiveDealCard";
import { BalanceCard } from "./BalanceCard";
import { PromoBanner } from "./PromoBanner";
import { RequestCard } from "./RequestCard";
import { ServiceGrid } from "./ServiceGrid";
import { TipBanner } from "./TipBanner";

// Phase 2 ใช้คำทักทายตาม mockup — ภายหลังค่อยคำนวณตามเวลา (ต้องทำฝั่ง client กัน hydration mismatch)
const GREETING = "สวัสดีตอนเช้า";

type HomeViewProps = { home: HomeDTO; onMenu?: () => void };

/** L1 — หน้าหลักผู้ให้เช่า (Figma: เนื้อหา pad 4/20/8/20 · gap 12) */
export function LandlordHomeView({ home, onMenu }: HomeViewProps) {
  return (
    <AppShell
      enter="fade"
      background={<ScreenBackground screen="L1" />}
      header={
        <HomeHeader
          greeting={GREETING}
          name={`คุณ${home.me.user.displayName}`}
          notificationCount={home.me.unreadNotifications}
          onMenu={onMenu}
        />
      }
      footer={<BottomNav active="home" />}
      indicatorClassName="bg-nav"
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      {home.activeDeals.map((d) => (
        <ActiveDealCard key={d.dealId} deal={d} />
      ))}
      <BalanceCard account={home.me.account} />
      <ServiceGrid kSureHref="/deals/new" />
      <PromoBanner href="/deals/new" />
    </AppShell>
  );
}

/** T1 — หน้าหลักผู้เช่า: การ์ดคำขอใหม่อยู่บนสุด */
export function TenantHomeView({ home, onMenu }: HomeViewProps) {
  const invite = home.pendingInvites[0];
  return (
    <AppShell
      enter="fade"
      background={<ScreenBackground screen="T1" />}
      header={
        <HomeHeader
          greeting={GREETING}
          name={`คุณ${home.me.user.displayName}`}
          notificationCount={home.me.unreadNotifications}
          onMenu={onMenu}
        />
      }
      footer={<BottomNav active="home" notificationCount={home.me.unreadNotifications} />}
      indicatorClassName="bg-nav"
      className="flex flex-col gap-3 px-5 pt-1 pb-2"
    >
      {invite && <RequestCard invite={invite} />}
      {home.activeDeals.map((d) => (
        <ActiveDealCard key={d.dealId} deal={d} />
      ))}
      <BalanceCard account={home.me.account} />
      <ServiceGrid kSureHref={invite && `/invites/${invite.shareCode}`} compact />
      <TipBanner />
    </AppShell>
  );
}
