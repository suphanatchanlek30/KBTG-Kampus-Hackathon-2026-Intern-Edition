import type { ComponentType } from "react";

export const SCREEN_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

/**
 * หน้าจอจริงที่จะวางใต้ mockup — Phase 2 เพิ่มทีละหน้า เช่น `L1: LandlordHome`
 * component ต้อง render ด้วย mock data ค่าตรง mockup (docs/01-user-flow.md §2)
 */
export const SCREENS: Partial<Record<ScreenId, ComponentType>> = {};

export const isScreenId = (v: string | null): v is ScreenId => SCREEN_IDS.includes(v as ScreenId);
