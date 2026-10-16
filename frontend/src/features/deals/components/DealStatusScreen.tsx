"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { downloadIcs } from "@/lib/calendar";
import { formatBaht } from "@/lib/format/money";
import { useCancelDeal, useDeal } from "../hooks";
import { DealStatusView, type DealStatusAction } from "./DealStatusView";

/** /deals/[id] — L5 / D1 (ผู้ให้เช่า) · D8 (ผู้เช่า) */
export function DealStatusScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const cancel = useCancelDeal();
  const [cancelOpen, setCancelOpen] = useState(false);

  // จบแบบไม่สำเร็จ (ปฏิเสธ / หมดอายุ / ยกเลิก-คืนเงิน) → D3
  const failed = deal && ["REJECTED", "EXPIRED", "REFUNDED"].includes(deal.state);
  useEffect(() => {
    if (failed) router.replace(`/deals/${id}/result`);
  }, [failed, id, router]);

  // ผู้ให้เช่าเฝ้าหน้านี้อยู่แล้วผู้เช่าปล่อยเงินครบ (เห็นผ่าน polling) → ไป L6 เอง (docs/05-api.md §5)
  // เปิดดีลที่จบไปแล้วตั้งแต่แรกไม่ย้าย — ดูสถานะได้ และมีปุ่มไปใบเสร็จ
  const seenState = useRef<string | null>(null);
  const released = deal?.myRole === "LANDLORD" && deal.state === "RELEASED";
  useEffect(() => {
    if (!deal) return;
    const prev = seenState.current;
    seenState.current = deal.state;
    if (released && prev !== null && prev !== "RELEASED") router.replace(`/deals/${deal.id}/complete`);
  }, [deal, released, router]);

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal || failed) return <ScreenSkeleton />;

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

  // ยอดที่จะคืนถ้ายกเลิก — ค่าจองที่ปล่อยแล้วไม่คืน (docs/04-database.md §6.4)
  const refundSatang = deal.amounts.heldSatang;
  const theyRequested = Boolean(
    deal.myRole === "TENANT" ? deal.cancel.landlordRequestedAt : deal.cancel.tenantRequestedAt,
  );

  return (
    <>
      <DealStatusView
        deal={deal}
        onBack={() => router.push("/home")}
        onShare={onShare}
        onAction={onAction}
        onCancel={() => setCancelOpen(true)}
      />
      {/* D11 — ยกเลิกต้องยินยอมทั้งสองฝ่าย (⚠️ รออนุมัติดีไซน์) */}
      <BottomSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={theyRequested ? "ยินยอมยกเลิกดีลนี้?" : "ขอยกเลิกดีลนี้?"}
      >
        <p className="text-body text-gray">
          {theyRequested
            ? `ยกเลิกทันทีและคืนเงินที่ยังกันไว้ ${formatBaht(refundSatang, 2)} ให้ผู้เช่า`
            : `ต้องให้อีกฝ่ายยินยอมด้วย · เมื่อยินยอมแล้ว เงินที่ยังกันไว้ ${formatBaht(refundSatang, 2)} จะคืนผู้เช่า`}
          {deal.state === "BOOKING_FEE_RELEASED" && " · ค่าจองที่ปล่อยแล้วไม่คืน"}
        </p>
        <div className="flex flex-col gap-2.5">
          <Button
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(deal, {
                onSuccess: (next) => {
                  setCancelOpen(false);
                  toast.success(next.state === "REFUNDED" ? "ยกเลิกดีลและคืนเงินแล้ว" : "ส่งคำขอยกเลิกแล้ว");
                },
              })
            }
          >
            {theyRequested ? "ยินยอมยกเลิก" : "ส่งคำขอยกเลิก"}
          </Button>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>
            ไม่ยกเลิก
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
