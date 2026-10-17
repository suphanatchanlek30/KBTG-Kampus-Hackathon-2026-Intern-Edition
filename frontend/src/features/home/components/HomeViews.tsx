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

const GREETING = "สวัสดีตอนเช้า";

type HomeViewProps = { home: HomeDTO; onMenu?: () => void; onBell?: () => void };

export function LandlordHomeView({ home, onMenu, onBell }: HomeViewProps) {
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
          onBell={onBell}
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

export function TenantHomeView({ home, onMenu, onBell }: HomeViewProps) {
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
          onBell={onBell}
        />
      }
      footer={<BottomNav active="home" notificationCount={home.me.unreadNotifications} scanHref="/scan" />}
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
