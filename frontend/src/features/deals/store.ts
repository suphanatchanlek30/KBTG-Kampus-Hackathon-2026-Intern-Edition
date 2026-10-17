import { create } from "zustand";
import { env } from "@/config/env";
import { DEMO_AMOUNTS, DEMO_PROPERTY, DEMO_TIMES } from "@/mocks/fixtures";
import { defaultDraftDates } from "./draft";
import type { DealDraft } from "./schema";

export const MOCKUP_DRAFT: DealDraft = {
  propertyId: DEMO_PROPERTY.id,
  totalSatang: DEMO_AMOUNTS.totalSatang,
  bookingFeeSatang: DEMO_AMOUNTS.bookingFeeSatang,
  viewingAt: DEMO_TIMES.viewingAt,
  moveInDate: DEMO_TIMES.moveInDate,
};

export const defaultDraft = (): DealDraft =>
  env.useMock ? MOCKUP_DRAFT : { ...MOCKUP_DRAFT, ...defaultDraftDates(new Date()) };

type DraftStore = {
  draft: DealDraft;
  update: (patch: Partial<DealDraft>) => void;
  reset: () => void;
};

export const useDealDraft = create<DraftStore>((set) => ({
  draft: defaultDraft(),
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: defaultDraft() }),
}));
