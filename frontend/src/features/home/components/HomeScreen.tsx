"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHome } from "@/features/deals/hooks";
import { LandlordHomeView, TenantHomeView } from "./HomeViews";

/** /home — L1 หรือ T1 ตาม role ของผู้ใช้ */
export function HomeScreen() {
  const { data: home } = useHome();

  if (!home) {
    return (
      <AppShell className="flex flex-col gap-3 px-5 pt-[68px] pb-2">
        <Skeleton className="h-[187px] rounded-card-xl" />
        <Skeleton className="h-[229px] rounded-card" />
        <Skeleton className="h-[166px] rounded-card-xl" />
      </AppShell>
    );
  }

  return home.me.user.role === "LANDLORD" ? <LandlordHomeView home={home} /> : <TenantHomeView home={home} />;
}
