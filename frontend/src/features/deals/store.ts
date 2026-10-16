import { create } from "zustand";
import { DEMO_AMOUNTS, DEMO_PROPERTY, DEMO_TIMES } from "@/mocks/fixtures";
import type { DealDraft } from "./schema";

// Phase 2: ค่าเริ่มต้นตรง mockup · Phase 7 จะเริ่มจากห้องแรกใน GET /properties
export const DEFAULT_DRAFT: DealDraft = {
  propertyId: DEMO_PROPERTY.id,
  totalSatang: DEMO_AMOUNTS.totalSatang,
  bookingFeeSatang: DEMO_AMOUNTS.bookingFeeSatang,
  viewingAt: DEMO_TIMES.viewingAt,
  moveInDate: DEMO_TIMES.moveInDate,
};

type DraftStore = {
  draft: DealDraft;
  update: (patch: Partial<DealDraft>) => void;
  reset: () => void;
};

/** ร่างดีลที่ส่งต่อจาก L2 ไป L3 (อยู่ฝั่ง client เท่านั้น — docs/04-database.md §2 DRAFT) */
export const useDealDraft = create<DraftStore>((set) => ({
  draft: DEFAULT_DRAFT,
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: DEFAULT_DRAFT }),
}));
