import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { InviteReviewScreen } from "@/features/invites/components/InviteReviewScreen";

export default function InvitePage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <InviteReviewScreen />
    </Suspense>
  );
}
