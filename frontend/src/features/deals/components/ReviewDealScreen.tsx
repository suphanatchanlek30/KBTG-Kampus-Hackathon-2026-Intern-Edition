"use client";

import { useRouter } from "next/navigation";
import { DEMO_PROPERTY } from "@/mocks/fixtures";
import { useCreateDeal, useMe } from "../hooks";
import { useDealDraft } from "../store";
import { ReviewDealView } from "./ReviewDealView";

/** /deals/new/review — L3 → สร้างดีล (WAITING_ACCEPT) → L4 */
export function ReviewDealScreen() {
  const router = useRouter();
  const { draft, reset } = useDealDraft();
  const { data: me } = useMe();
  const createDeal = useCreateDeal();

  const submit = () =>
    createDeal.mutate(draft, {
      onSuccess: (deal) => {
        reset();
        router.replace(`/deals/${deal.id}/share`);
      },
    });

  return (
    <ReviewDealView
      draft={draft}
      property={DEMO_PROPERTY}
      landlord={{
        displayName: me?.user.displayName ?? "",
        accountNoMasked: me?.account.accountNoMasked ?? "",
      }}
      submitting={createDeal.isPending}
      onSubmit={submit}
    />
  );
}
