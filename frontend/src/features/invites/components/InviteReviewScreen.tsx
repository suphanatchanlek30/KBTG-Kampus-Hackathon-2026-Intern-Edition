"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useInvite, useRejectDeal } from "@/features/deals/hooks";
import { errorMessage } from "@/lib/api/errors";
import { InviteReviewView } from "./InviteReviewView";

/** /invites/[code] — T2 (ผิดพลาด/หมดอายุ = D6 ซึ่งยังรอออกแบบ) */
export function InviteReviewScreen() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { data: deal, error, isPending } = useInvite(code);
  const reject = useRejectDeal();
  const [confirmReject, setConfirmReject] = useState(false);

  // คำขอนี้ไม่ได้รอผู้เช่าแล้ว (เช่น กันเงินไปแล้ว) → ไปหน้าสถานะดีล
  const redirectTo = deal && deal.state !== "WAITING_ACCEPT" ? `/deals/${deal.id}` : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (isPending || redirectTo) return <ScreenSkeleton />;

  if (error || !deal) {
    // D6 — placeholder จนกว่าจะอนุมัติดีไซน์ (docs/01-user-flow.md §7)
    return (
      <AppShell
        enter="push"
        header={<AppHeader title="คำขอ K Sure" left="back" onLeft={() => router.push("/home")} />}
        className="flex flex-col items-center justify-center gap-2 px-8 text-center"
      >
        <p className="text-title-sm">ใช้คำขอนี้ไม่ได้</p>
        <p className="text-body text-gray">{errorMessage(error)}</p>
      </AppShell>
    );
  }

  return (
    <>
      <InviteReviewView
        deal={deal}
        rejecting={reject.isPending}
        onBack={() => router.push("/home")}
        onAccept={() => router.push(`/deals/${deal.id}/lock`)}
        onReject={() => setConfirmReject(true)}
      />
      <BottomSheet open={confirmReject} onClose={() => setConfirmReject(false)} title="ปฏิเสธดีลนี้?">
        <div className="flex flex-col gap-3">
          <p className="text-body text-gray">ผู้ให้เช่าจะได้รับแจ้งว่าคุณปฏิเสธ และคำขอนี้จะใช้ไม่ได้อีก</p>
          <Button
            variant="secondary"
            loading={reject.isPending}
            onClick={() =>
              reject.mutate(deal, {
                onSuccess: () => {
                  setConfirmReject(false);
                  router.replace("/home");
                },
              })
            }
          >
            ปฏิเสธดีล
          </Button>
          <Button onClick={() => setConfirmReject(false)}>กลับไปตรวจสอบ</Button>
        </div>
      </BottomSheet>
    </>
  );
}
