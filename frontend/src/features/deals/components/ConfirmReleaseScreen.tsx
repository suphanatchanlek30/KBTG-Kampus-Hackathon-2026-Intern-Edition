"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatExpiry } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import { useConfirmMoveIn, useConfirmViewing, useDeal, useReportIssue } from "../hooks";
import { CHECKLISTS, ConfirmReleaseView, type ReleaseKind } from "./ConfirmReleaseView";

const REQUIRED_STATE = { viewing: "FUNDS_LOCKED", "move-in": "BOOKING_FEE_RELEASED" } as const;

/** /deals/[id]/confirm-viewing (T5 + D4) · /deals/[id]/confirm-move-in (T6 + D5) */
export function ConfirmReleaseScreen({ kind }: { kind: ReleaseKind }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const reportIssue = useReportIssue();
  const confirmViewing = useConfirmViewing();
  const confirmMoveIn = useConfirmMoveIn();
  const mutation = kind === "viewing" ? confirmViewing : confirmMoveIn;
  const [checked, setChecked] = useState(() => CHECKLISTS[kind].map(() => false));
  const [sheetOpen, setSheetOpen] = useState(false);
  const { reset: resetMutation } = mutation;

  // หน้านี้ค้างอยู่ใน <Activity> หลังออกไป — ตอนถูกซ่อน (cleanup) ล้าง state ของการเข้าหน้ารอบนี้
  // เพื่อให้รอบถัดไปเริ่มใหม่: เช็กลิสต์ว่าง, sheet ปิด, mutation ไม่ค้าง isSuccess
  useEffect(
    () => () => {
      setChecked(CHECKLISTS[kind].map(() => false));
      setSheetOpen(false);
      resetMutation();
    },
    [kind, resetMutation],
  );

  // เปิดหน้าผิด state (เช่น ปล่อยค่าจองไปแล้ว) → กลับหน้าสถานะดีล (docs/01-user-flow.md §8 Guard)
  // ระหว่าง/หลังกดยืนยันในรอบนี้ไม่ต้อง redirect เพราะ onSuccess พาไปหน้าถัดไปเอง
  const wrongState = deal && deal.state !== REQUIRED_STATE[kind] && mutation.isIdle;
  useEffect(() => {
    if (wrongState) router.replace(`/deals/${id}`);
  }, [wrongState, id, router]);

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal || wrongState) return <ScreenSkeleton />;

  const confirm = () =>
    mutation.mutate(deal, {
      onSuccess: () => {
        if (kind === "viewing") {
          toast.success(`ปล่อยค่าจอง ${formatBaht(deal.amounts.bookingFeeSatang)} แล้ว`);
          router.replace(`/deals/${deal.id}`);
        } else {
          router.replace(`/deals/${deal.id}/complete`);
        }
      },
    });

  return (
    <>
      <ConfirmReleaseView
        kind={kind}
        deal={deal}
        checked={checked}
        submitting={mutation.isPending}
        onToggle={(i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
        onBack={() => router.back()}
        onConfirm={confirm}
        onNotReady={() => setSheetOpen(true)}
      />

      {/* D4 / D5 — ตามคำอธิบายใน docs/01-user-flow.md §7 (⚠️ รออนุมัติดีไซน์) */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={kind === "viewing" ? "ยังไม่พร้อมปล่อยค่าจอง?" : "ยังไม่ได้เข้าอยู่?"}
      >
        {kind === "viewing" ? (
          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" onClick={() => router.replace(`/deals/${deal.id}`)}>
              ยังไม่ได้ไปดูห้อง (กลับไปก่อน)
            </Button>
            {deal.hasOpenIssue ? (
              <p className="text-caption text-muted">แจ้งปัญหาห้องไม่ตรงไปแล้ว · เงินยังกันไว้ ยังไม่ปล่อยค่าจอง</p>
            ) : (
              <Button
                variant="secondary"
                loading={reportIssue.isPending}
                onClick={() =>
                  reportIssue.mutate(deal, {
                    onSuccess: () => {
                      toast.success("แจ้งปัญหาแล้ว · เงินยังกันไว้ ไม่ปล่อยค่าจอง");
                      router.replace(`/deals/${deal.id}`);
                    },
                  })
                }
              >
                ห้องไม่ตรงกับดีล → แจ้งปัญหา
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-body text-gray">เงินยังกันไว้ จะคืนอัตโนมัติถ้าเลย {formatExpiry(deal.expiresAt)}</p>
            <Button onClick={() => setSheetOpen(false)}>เข้าใจแล้ว</Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
