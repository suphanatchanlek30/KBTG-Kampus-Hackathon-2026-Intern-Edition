import { create } from "zustand";
import { env } from "@/config/env";
import { DEMO_AMOUNTS, DEMO_PROPERTY, DEMO_TIMES } from "@/mocks/fixtures";
import { defaultDraftDates } from "./draft";
import type { DealDraft } from "./schema";

/** ร่างตามค่าใน mockup เป๊ะ — /dev/overlay ใช้เทียบ pixel */
export const MOCKUP_DRAFT: DealDraft = {
  propertyId: DEMO_PROPERTY.id,
  totalSatang: DEMO_AMOUNTS.totalSatang,
  bookingFeeSatang: DEMO_AMOUNTS.bookingFeeSatang,
  viewingAt: DEMO_TIMES.viewingAt,
  moveInDate: DEMO_TIMES.moveInDate,
};

/**
 * ค่าเริ่มต้นฟอร์ม L2 — mock ใช้วันที่ตรง mockup (เทียบ pixel) · API จริงคำนวณจากวันนี้ (วันใน mockup ผ่านไปแล้ว server ไม่รับ)
 * propertyId ของจริงมาจาก GET /properties (ReviewDealScreen ใส่ให้ตอนส่ง)
 */
export const defaultDraft = (): DealDraft =>
  env.useMock ? MOCKUP_DRAFT : { ...MOCKUP_DRAFT, ...defaultDraftDates(new Date()) };

type DraftStore = {
  draft: DealDraft;
  update: (patch: Partial<DealDraft>) => void;
  reset: () => void;
};

/** ร่างดีลที่ส่งต่อจาก L2 ไป L3 (อยู่ฝั่ง client เท่านั้น — docs/04-database.md §2 DRAFT) */
export const useDealDraft = create<DraftStore>((set) => ({
  draft: defaultDraft(),
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: defaultDraft() }),
}));
