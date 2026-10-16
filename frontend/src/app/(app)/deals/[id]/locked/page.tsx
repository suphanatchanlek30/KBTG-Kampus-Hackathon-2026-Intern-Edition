import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { LockedScreen } from "@/features/lock/components/LockedScreen";

export default function LockedPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <LockedScreen />
    </Suspense>
  );
}
