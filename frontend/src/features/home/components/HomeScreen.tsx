"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { env } from "@/config/env";
import { useHome } from "@/features/deals/hooks";
import { DemoMenuSheet } from "@/features/demo/DemoTools";
import { LandlordHomeView, TenantHomeView } from "./HomeViews";

/** /home — L1 หรือ T1 ตาม role ของผู้ใช้ · ปุ่มเมนูเปิด sheet สลับ role (เฉพาะโหมด mock) */
export function HomeScreen() {
  const { data: home } = useHome();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!home) {
    return (
      <AppShell className="flex flex-col gap-3 px-5 pt-[68px] pb-2">
        <Skeleton className="h-[187px] rounded-card-xl" />
        <Skeleton className="h-[229px] rounded-card" />
        <Skeleton className="h-[166px] rounded-card-xl" />
      </AppShell>
    );
  }

  const onMenu = env.useMock ? () => setMenuOpen(true) : undefined;

  return (
    <>
      {home.me.user.role === "LANDLORD" ? (
        <LandlordHomeView home={home} onMenu={onMenu} />
      ) : (
        <TenantHomeView home={home} onMenu={onMenu} />
      )}
      <DemoMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
