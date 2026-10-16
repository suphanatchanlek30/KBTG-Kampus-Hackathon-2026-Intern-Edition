import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { ConfirmReleaseScreen } from "@/features/deals/components/ConfirmReleaseScreen";

export default function ConfirmMoveInPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ConfirmReleaseScreen kind="move-in" />
    </Suspense>
  );
}
