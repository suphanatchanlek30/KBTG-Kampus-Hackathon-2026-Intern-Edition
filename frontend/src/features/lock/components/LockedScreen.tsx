"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { useDeal, useMe } from "@/features/deals/hooks";
import { LockedView } from "./LockedView";

/** /deals/[id]/locked — T4 */
export function LockedScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal } = useDeal(id);
  const { data: me } = useMe();

  if (!deal || !me) return <ScreenSkeleton />;

  return (
    <LockedView
      deal={deal}
      account={me.account}
      onClose={() => router.replace("/home")}
      onShare={() => toast.success("บันทึก/แชร์หลักฐานจะเปิดใช้ใน Phase 8")}
      onViewStatus={() => router.replace(`/deals/${deal.id}`)}
      onHome={() => router.replace("/home")}
    />
  );
}
