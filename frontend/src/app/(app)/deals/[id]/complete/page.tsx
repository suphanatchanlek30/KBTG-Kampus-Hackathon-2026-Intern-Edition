import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { CompleteScreen } from "@/features/receipt/components/CompleteScreen";

export default function CompletePage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <CompleteScreen />
    </Suspense>
  );
}
