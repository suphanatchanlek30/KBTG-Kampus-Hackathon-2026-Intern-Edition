import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { LockScreen } from "@/features/lock/components/LockScreen";

export default function LockPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <LockScreen />
    </Suspense>
  );
}
