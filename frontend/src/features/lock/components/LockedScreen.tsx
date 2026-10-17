"use client";

import { useParams, useRouter } from "next/navigation";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { useDeal, useMe } from "@/features/deals/hooks";
import { shareText } from "@/lib/export-image";
import { formatBaht } from "@/lib/format/money";
import { LockedView } from "./LockedView";

/** Handles the locked-funds confirmation route. */
export function LockedScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const { data: me } = useMe();

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal || !me) return <ScreenSkeleton />;

  return (
    <LockedView
      deal={deal}
      account={me.account}
      onClose={() => router.replace("/home")}
      onShare={async () => {
        const res = await shareText({
          title: `${brand.name} · กันเงินแล้ว`,
          text: `กันเงิน ${formatBaht(deal.amounts.totalSatang, 2)} สำหรับ ${deal.property.projectName} ${deal.property.unitNo} แล้ว (${deal.refNo}) · ${brand.disclaimer}`,
        }).catch(() => "cancelled" as const);
        if (res === "copied") toast.success("คัดลอกแล้ว");
      }}
      onViewStatus={() => router.replace(`/deals/${deal.id}`)}
      onHome={() => router.replace("/home")}
    />
  );
}
