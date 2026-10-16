"use client";

import { useRouter } from "next/navigation";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { useCreateDeal, useMe, useProperty } from "../hooks";
import { useDealDraft } from "../store";
import { ReviewDealView } from "./ReviewDealView";

/** /deals/new/review — L3 → สร้างดีล (WAITING_ACCEPT) → L4 */
export function ReviewDealScreen() {
  const router = useRouter();
  const { draft, reset } = useDealDraft();
  const { data: me } = useMe();
  const { data: property } = useProperty();
  const createDeal = useCreateDeal();

  if (!property) return <ScreenSkeleton />;

  const submit = () =>
    createDeal.mutate(
      { ...draft, propertyId: property.id },
      {
        onSuccess: (deal) => {
          reset();
          router.replace(`/deals/${deal.id}/share`);
        },
      },
    );

  return (
    <ReviewDealView
      draft={draft}
      property={property}
      landlord={{
        displayName: me?.user.displayName ?? "",
        accountNoMasked: me?.account.accountNoMasked ?? "",
      }}
      submitting={createDeal.isPending}
      onSubmit={submit}
    />
  );
}
