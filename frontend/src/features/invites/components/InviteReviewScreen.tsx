"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useInvite, useRejectDeal } from "@/features/deals/hooks";
import { InviteReviewView } from "./InviteReviewView";

export function InviteReviewScreen() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { data: deal, error, isPending } = useInvite(code);
  const reject = useRejectDeal();
  const [confirmReject, setConfirmReject] = useState(false);

  const redirectTo = deal && deal.state !== "WAITING_ACCEPT" ? `/deals/${deal.id}` : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (isPending || redirectTo) return <ScreenSkeleton />;

  if (error || !deal) return <ErrorScreen error={error} title="ใช้คำขอนี้ไม่ได้" />;

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
                  router.replace(`/deals/${deal.id}/result`); // D3
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
