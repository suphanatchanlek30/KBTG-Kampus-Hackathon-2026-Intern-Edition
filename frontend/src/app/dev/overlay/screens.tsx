import type { ComponentType } from "react";
import { LandlordHomeView, TenantHomeView } from "@/features/home/components/HomeViews";
import { makeDeal, makeHome } from "@/mocks/fixtures";

export const SCREEN_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

const invited = (role: "LANDLORD" | "TENANT") => makeDeal("WAITING_ACCEPT", role);

/**
 * หน้าจอจริงที่วางใต้ mockup — render ชั้นแสดงผลด้วย fixture ตรงๆ (ไม่ผ่าน mock DB)
 * จึงแสดงได้ทุก state/role พร้อมกัน (docs/01-user-flow.md §2)
 */
export const SCREENS: Partial<Record<ScreenId, ComponentType>> = {
  L1: () => <LandlordHomeView home={makeHome("LANDLORD", invited("LANDLORD"))} />,
  T1: () => <TenantHomeView home={makeHome("TENANT", invited("TENANT"))} />,
};

export const isScreenId = (v: string | null): v is ScreenId => SCREEN_IDS.includes(v as ScreenId);
