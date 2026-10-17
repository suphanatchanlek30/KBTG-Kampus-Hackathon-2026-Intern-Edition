"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PinPad } from "@/components/ui/PinPad";
import { useDeal, useLockDeal, useMe } from "@/features/deals/hooks";
import { LockView, type ScanPhase } from "./LockView";

const SCAN_MS = 1800;
const MIN_TOTAL_MS = 2400;

export function LockScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const { data: me } = useMe();
  const lock = useLockDeal();
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [attempt, setAttempt] = useState(0);
  const [pinOpen, setPinOpen] = useState(false);
  const scanStartedAt = useRef(0);

  const waiting = deal?.state === "WAITING_ACCEPT";

  useEffect(() => {
    if (!deal || !waiting || pinOpen) return;
    scanStartedAt.current = Date.now();
    const reset = setTimeout(() => setPhase("scanning"), 0);
    const scan = setTimeout(() => {
      setPhase("success");
      navigator.vibrate?.(15);
      lock.mutate({ deal, method: "FACE_ID" }, { onError: () => setPhase("error") });
    }, SCAN_MS);
    return () => {
      clearTimeout(reset);
      clearTimeout(scan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, waiting, attempt, pinOpen]);

  const locked = deal?.state === "FUNDS_LOCKED";
  useEffect(() => {
    if (!locked) return;
    const wait = Math.max(0, MIN_TOTAL_MS - (Date.now() - scanStartedAt.current));
    const t = setTimeout(() => router.replace(`/deals/${id}/locked`), wait);
    return () => clearTimeout(t);
  }, [locked, id, router]);

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal || !me) return <ScreenSkeleton />;

  return (
    <>
      <LockView
        amountSatang={deal.amounts.totalSatang}
        accountType={me.account.accountType}
        accountNoMasked={me.account.accountNoMasked}
        phase={locked ? "success" : phase}
        pending={lock.isPending}
        onClose={() => router.back()}
        onUsePin={() => setPinOpen(true)}
        onRetry={() => setAttempt((a) => a + 1)}
      />
      <BottomSheet open={pinOpen && !locked} onClose={() => setPinOpen(false)} title="ใส่รหัส PIN">
        <p className="-mt-2 text-caption text-muted">เดโม: ใส่เลขอะไรก็ได้ 6 หลัก · ไม่ส่งและไม่เก็บรหัส</p>
        <PinPad
          key={attempt}
          disabled={lock.isPending}
          onComplete={() =>
            lock.mutate(
              { deal, method: "PIN" },
              { onError: () => setAttempt((a) => a + 1) }, // Reset the entry indicators.
            )
          }
        />
      </BottomSheet>
    </>
  );
}
