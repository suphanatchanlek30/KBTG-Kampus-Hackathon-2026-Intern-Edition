import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { DealStatusScreen } from "@/features/deals/components/DealStatusScreen";

export default function DealStatusPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <DealStatusScreen />
    </Suspense>
  );
}
