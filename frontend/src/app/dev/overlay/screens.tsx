import type { ComponentType } from "react";
import { ConfirmReleaseView } from "@/features/deals/components/ConfirmReleaseView";
import { CreateDealView } from "@/features/deals/components/CreateDealView";
import { DealStatusView } from "@/features/deals/components/DealStatusView";
import { ShareInviteView } from "@/features/deals/components/ShareInviteView";
import { ReviewDealView } from "@/features/deals/components/ReviewDealView";
import { MOCKUP_DRAFT } from "@/features/deals/store";
import { InviteReviewView } from "@/features/invites/components/InviteReviewView";
import { LockedView } from "@/features/lock/components/LockedView";
import { LockView } from "@/features/lock/components/LockView";
import { LandlordHomeView, TenantHomeView } from "@/features/home/components/HomeViews";
import { CompleteView } from "@/features/receipt/components/CompleteView";
import { TransferView } from "@/features/transfer/components/TransferView";
import { DEMO_PROPERTY, DEMO_TRANSFER, DEMO_USERS, makeDeal, makeHome, makeMe } from "@/mocks/fixtures";

export const SCREEN_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

const invited = (role: "LANDLORD" | "TENANT") => makeDeal("WAITING_ACCEPT", role);
const tenantLocked = makeDeal("FUNDS_LOCKED", "TENANT");

/**
 * หน้าจอจริงที่วางใต้ mockup — render ชั้นแสดงผลด้วย fixture ตรงๆ (ไม่ผ่าน mock DB)
 * จึงแสดงได้ทุก state/role พร้อมกัน (docs/01-user-flow.md §2)
 */
export const SCREENS: Partial<Record<ScreenId, ComponentType>> = {
  L1: () => <LandlordHomeView home={makeHome("LANDLORD", null)} />,
  L2: () => <CreateDealView draft={MOCKUP_DRAFT} property={DEMO_PROPERTY} />,
  L3: () => (
    <ReviewDealView
      draft={MOCKUP_DRAFT}
      property={DEMO_PROPERTY}
      landlord={{
        displayName: DEMO_USERS.LANDLORD.user.displayName,
        accountNoMasked: DEMO_USERS.LANDLORD.account.accountNoMasked,
      }}
    />
  ),
  L4: () => <ShareInviteView deal={invited("LANDLORD")} inviteUrl="https://ksure.demo/invites/KS-8F4Q21" />,
  L5: () => <DealStatusView deal={makeDeal("FUNDS_LOCKED", "LANDLORD")} />,
  T4: () => <LockedView deal={tenantLocked} account={makeMe("TENANT", tenantLocked).account} />,
  T5: () => <ConfirmReleaseView kind="viewing" deal={tenantLocked} checked={[true, true, true]} />,
  T6: () => (
    <ConfirmReleaseView kind="move-in" deal={makeDeal("BOOKING_FEE_RELEASED", "TENANT")} checked={[true, true, true]} />
  ),
  L6: () => <CompleteView deal={makeDeal("RELEASED", "LANDLORD")} account={DEMO_USERS.LANDLORD.account} />,
  T7: () => <CompleteView deal={makeDeal("RELEASED", "TENANT")} account={DEMO_USERS.TENANT.account} />,
  T8: () => <TransferView {...DEMO_TRANSFER} warning="บัญชีนี้เป็นคู่ดีล K Sure ของคุณ (ห้อง A1203) ที่ยังไม่จบ" />,
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
