"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { useDeal, useMe } from "@/features/deals/hooks";
import { CompleteView } from "./CompleteView";

/** /deals/[id]/complete — L6 (ผู้ให้เช่า) · T7 (ผู้เช่า) */
export function CompleteScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal } = useDeal(id);
  const { data: me } = useMe();

  // ยังปล่อยไม่ครบ → กลับหน้าสถานะ
  const notDone = deal && deal.state !== "RELEASED";
  useEffect(() => {
    if (notDone) router.replace(`/deals/${id}`);
  }, [notDone, id, router]);

  if (!deal || !me || notDone) return <ScreenSkeleton />;

  return (
    <CompleteView
      deal={deal}
      account={me.account}
      onClose={() => router.replace("/home")}
      onDone={() => router.replace("/home")}
    />
  );
}
