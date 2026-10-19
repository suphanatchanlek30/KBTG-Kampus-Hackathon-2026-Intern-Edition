"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { useDeal } from "@/features/deals/hooks";
import { errorMessage } from "@/lib/api/errors";
import { findVisible, saveImage, shareText } from "@/lib/export-image";
import { formatBaht } from "@/lib/format/money";
import { LockSlipView } from "./LockSlipView";

export function LockSlipScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);

  // Only a deal the tenant has actually locked funds for has a slip.
  const noSlip = deal && (deal.myRole !== "TENANT" || !deal.timeline.some((e) => e.type === "FUNDS_LOCKED"));
  useEffect(() => {
    if (noSlip) router.replace(`/deals/${id}`);
  }, [noSlip, id, router]);

  if (error && !deal) return <ErrorScreen error={error} />;
  if (!deal || noSlip) return <ScreenSkeleton />;

  return (
    <LockSlipView
      deal={deal}
      onClose={() => router.replace(`/deals/${deal.id}`)}
      onViewStatus={() => router.replace(`/deals/${deal.id}`)}
      onShare={async () => {
        const res = await shareText({
          title: `${brand.name} · สลิปกันเงิน`,
          text: `กันเงิน ${formatBaht(deal.amounts.totalSatang, 2)} สำหรับ ${deal.property.projectName} ${deal.property.unitNo} (${deal.refNo}) · ${brand.disclaimer}`,
        }).catch(() => "cancelled" as const);
        if (res === "copied") toast.success("คัดลอกแล้ว");
      }}
      onSave={async () => {
        const node = findVisible('[data-export="proof"]');
        if (!node) return;
        try {
          if ((await saveImage(node, `ksure-lock-slip-${deal.refNo}.png`)) === "downloaded")
            toast.success("บันทึกสลิปแล้ว");
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
    />
  );
}
