"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { downloadIcs } from "@/lib/calendar";
import { useDeal } from "../hooks";
import { DealStatusView, type DealStatusAction } from "./DealStatusView";

/** /deals/[id] — L5 / D1 (ผู้ให้เช่า) · D8 (ผู้เช่า) */
export function DealStatusScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal } = useDeal(id);

  if (!deal) return <ScreenSkeleton />;

  const title = `${brand.name} · ${deal.property.projectName} ${deal.property.unitNo}`;

  const onAction = (action: DealStatusAction) => {
    switch (action) {
      case "show-qr":
        return router.push(`/deals/${deal.id}/share`);
      case "add-viewing":
        return downloadIcs(`ksure-viewing-${deal.refNo}.ics`, {
          uid: `${deal.id}-viewing@ksure`,
          title: `นัดดูห้อง · ${title}`,
          start: deal.viewingAt,
          description: `ผู้เช่ายืนยันว่าดูห้องแล้ว = ปล่อยค่าจอง (${deal.refNo})`,
        });
      case "add-move-in":
        return downloadIcs(`ksure-move-in-${deal.refNo}.ics`, {
          uid: `${deal.id}-move-in@ksure`,
          title: `วันเข้าอยู่ · ${title}`,
          start: deal.moveInDate,
          allDay: true,
          description: `ผู้เช่ายืนยันการเข้าอยู่ = ปล่อยมัดจำหลัก (${deal.refNo})`,
        });
      case "confirm-viewing":
        return router.push(`/deals/${deal.id}/confirm-viewing`);
      case "confirm-move-in":
        return router.push(`/deals/${deal.id}/confirm-move-in`);
      case "receipt":
        return router.push(`/deals/${deal.id}/complete`);
    }
  };

  const onShare = async () => {
    const text = `${title} — สถานะ: ${deal.refNo}`;
    try {
      if (navigator.share) await navigator.share({ title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("คัดลอกสถานะดีลแล้ว");
      }
    } catch {
      // ผู้ใช้ปิดหน้าต่างแชร์ — ไม่ต้องทำอะไร
    }
  };

  return <DealStatusView deal={deal} onBack={() => router.push("/home")} onShare={onShare} onAction={onAction} />;
}
