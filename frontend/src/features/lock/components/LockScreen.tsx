"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { useDeal, useLockDeal, useMe } from "@/features/deals/hooks";
import { LockView, type ScanPhase } from "./LockView";

// จังหวะตาม docs/02-ui-spec.md §5.2: สแกน 1.8s → สำเร็จ → เรียก lock → ไป T4 เมื่อ API สำเร็จและผ่านไป ≥ 2.4s
const SCAN_MS = 1800;
const MIN_TOTAL_MS = 2400;

/** /deals/[id]/lock — T3 (D2 PIN pad ผ่าน ?method=pin จะทำใน Phase 8) */
export function LockScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal } = useDeal(id);
  const { data: me } = useMe();
  const lock = useLockDeal();
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [attempt, setAttempt] = useState(0);
  const started = useRef(false);

  const run = useCallback(() => {
    if (!deal) return;
    const startedAt = Date.now();
    const scan = setTimeout(() => {
      setPhase("success");
      navigator.vibrate?.(15);
      lock.mutate(deal, {
        onSuccess: () => {
          const wait = Math.max(0, MIN_TOTAL_MS - (Date.now() - startedAt));
          setTimeout(() => router.replace(`/deals/${deal.id}/locked`), wait);
        },
        onError: () => setPhase("error"),
      });
    }, SCAN_MS);
    return () => clearTimeout(scan);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เริ่มสแกนใหม่เฉพาะเมื่อเปลี่ยนดีลหรือกดลองใหม่
  }, [deal?.id, attempt]);

  useEffect(() => {
    // ดีลถูกกันเงินไปแล้ว (เช่น กด back กลับมา) → ไม่สแกนซ้ำ
    if (!deal || deal.state !== "WAITING_ACCEPT" || started.current) return;
    started.current = true;
    return run();
  }, [deal, run]);

  if (!deal || !me) return <ScreenSkeleton />;

  return (
    <LockView
      amountSatang={deal.amounts.totalSatang}
      accountType={me.account.accountType}
      accountNoMasked={me.account.accountNoMasked}
      phase={phase}
      onClose={() => router.back()}
      onUsePin={() => toast.success("PIN pad (D2) จะเปิดใช้ใน Phase 8")}
      onRetry={() => {
        started.current = false;
        setPhase("scanning");
        setAttempt((a) => a + 1);
      }}
    />
  );
}
