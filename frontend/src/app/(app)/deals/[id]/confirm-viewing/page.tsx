import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { ConfirmReleaseScreen } from "@/features/deals/components/ConfirmReleaseScreen";

export default function ConfirmViewingPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ConfirmReleaseScreen kind="viewing" />
    </Suspense>
  );
}
