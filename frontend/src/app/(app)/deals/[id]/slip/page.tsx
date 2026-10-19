import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { LockSlipScreen } from "@/features/lock/components/LockSlipScreen";

export default function LockSlipPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <LockSlipScreen />
    </Suspense>
  );
}
