"use client";

import { useRouter } from "next/navigation";
import { DEMO_PROPERTY } from "@/mocks/fixtures";
import { useDealDraft } from "../store";
import { CreateDealView } from "./CreateDealView";

/** /deals/new — L2 */
export function CreateDealScreen() {
  const router = useRouter();
  const { draft, update } = useDealDraft();
  // Phase 7: ดึงห้องจาก GET /properties
  return (
    <CreateDealView
      draft={draft}
      property={DEMO_PROPERTY}
      onChange={update}
      onNext={() => router.push("/deals/new/review")}
    />
  );
}
