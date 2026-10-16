import type { ComponentType } from "react";
import { CreateDealView } from "@/features/deals/components/CreateDealView";
import { DealStatusView } from "@/features/deals/components/DealStatusView";
import { ShareInviteView } from "@/features/deals/components/ShareInviteView";
import { ReviewDealView } from "@/features/deals/components/ReviewDealView";
import { DEFAULT_DRAFT } from "@/features/deals/store";
import { InviteReviewView } from "@/features/invites/components/InviteReviewView";
import { LockView } from "@/features/lock/components/LockView";
import { LandlordHomeView, TenantHomeView } from "@/features/home/components/HomeViews";
import { DEMO_PROPERTY, DEMO_USERS, makeDeal, makeHome } from "@/mocks/fixtures";

export const SCREEN_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

const invited = (role: "LANDLORD" | "TENANT") => makeDeal("WAITING_ACCEPT", role);

/**
 * หน้าจอจริงที่วางใต้ mockup — render ชั้นแสดงผลด้วย fixture ตรงๆ (ไม่ผ่าน mock DB)
 * จึงแสดงได้ทุก state/role พร้อมกัน (docs/01-user-flow.md §2)
 */
export const SCREENS: Partial<Record<ScreenId, ComponentType>> = {
  L1: () => <LandlordHomeView home={makeHome("LANDLORD", invited("LANDLORD"))} />,
  L2: () => <CreateDealView draft={DEFAULT_DRAFT} property={DEMO_PROPERTY} />,
  L3: () => (
    <ReviewDealView
      draft={DEFAULT_DRAFT}
      property={DEMO_PROPERTY}
      landlord={{
        displayName: DEMO_USERS.LANDLORD.user.displayName,
        accountNoMasked: DEMO_USERS.LANDLORD.account.accountNoMasked,
      }}
    />
  ),
  L4: () => <ShareInviteView deal={invited("LANDLORD")} inviteUrl="https://ksure.demo/invites/KS-8F4Q21" />,
  L5: () => <DealStatusView deal={makeDeal("FUNDS_LOCKED", "LANDLORD")} />,
  T1: () => <TenantHomeView home={makeHome("TENANT", invited("TENANT"))} />,
  T2: () => <InviteReviewView deal={invited("TENANT")} />,
  T3: () => (
    <LockView
      amountSatang={650_000}
      accountType={DEMO_USERS.TENANT.account.accountType}
      accountNoMasked={DEMO_USERS.TENANT.account.accountNoMasked}
      phase="scanning"
    />
  ),
};

export const isScreenId = (v: string | null): v is ScreenId => SCREEN_IDS.includes(v as ScreenId);
