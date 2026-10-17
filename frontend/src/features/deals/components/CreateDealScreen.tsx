"use client";

import { useRouter } from "next/navigation";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { useProperty } from "../hooks";
import { useDealDraft } from "../store";
import { CreateDealView } from "./CreateDealView";

/** Handles the deal-creation route. */
export function CreateDealScreen() {
  const router = useRouter();
  const { draft, update } = useDealDraft();
  const { data: property } = useProperty();
  if (!property) return <ScreenSkeleton />;
  return (
    <CreateDealView
      draft={draft}
      property={property}
      onChange={update}
      onNext={() => router.push("/deals/new/review")}
    />
  );
}
