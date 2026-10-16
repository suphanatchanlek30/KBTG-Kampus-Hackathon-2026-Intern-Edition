"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { useDeal, useMe } from "@/features/deals/hooks";
import { errorMessage } from "@/lib/api/errors";
import { findVisible, saveImage, shareText } from "@/lib/export-image";
import { formatBaht } from "@/lib/format/money";
import { CompleteView } from "./CompleteView";

/** /deals/[id]/complete — L6 (ผู้ให้เช่า) · T7 (ผู้เช่า) */
export function CompleteScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const { data: me } = useMe();

  // ยังปล่อยไม่ครบ → กลับหน้าสถานะ
  const notDone = deal && deal.state !== "RELEASED";
  useEffect(() => {
    if (notDone) router.replace(`/deals/${id}`);
  }, [notDone, id, router]);

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal || !me || notDone) return <ScreenSkeleton />;

  return (
    <CompleteView
      deal={deal}
      account={me.account}
      onClose={() => router.replace("/home")}
      onDone={() => router.replace("/home")}
      onShare={async () => {
        const res = await shareText({
          title: `หลักฐานดีล ${deal.refNo}`,
          text: `${brand.name} · ${deal.property.projectName} ${deal.property.unitNo} — ปล่อยเงินครบ ${formatBaht(deal.amounts.releasedSatang, 2)} (${deal.refNo}) · ${brand.disclaimer}`,
        }).catch(() => "cancelled" as const);
        if (res === "copied") toast.success("คัดลอกแล้ว");
      }}
      onSaveProof={async () => {
        const node = findVisible('[data-export="proof"]');
        if (!node) return;
        try {
          if ((await saveImage(node, `ksure-proof-${deal.refNo}.png`)) === "downloaded")
            toast.success("บันทึกหลักฐานแล้ว");
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
    />
  );
}
