import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { ShareInviteScreen } from "@/features/deals/components/ShareInviteScreen";

export default function ShareInvitePage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ShareInviteScreen />
    </Suspense>
  );
}
