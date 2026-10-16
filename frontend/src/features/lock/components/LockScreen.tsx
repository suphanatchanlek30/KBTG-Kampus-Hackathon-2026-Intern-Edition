"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { useDeal, useLockDeal, useMe } from "@/features/deals/hooks";
import { LockView, type ScanPhase } from "./LockView";

// จังหวะตาม docs/02-ui-spec.md §5.2: สแกน 1.8s → สำเร็จ → เรียก lock → ไป T4 เมื่อ API สำเร็จและผ่านไป ≥ 2.4s
const SCAN_MS = 1800;
const MIN_TOTAL_MS = 2400;

/**
 * /deals/[id]/lock — T3 (D2 PIN pad ผ่าน ?method=pin จะทำใน Phase 8)
 *
 * Cache Components เก็บหน้านี้ไว้ใน <Activity> เมื่อออกไป (ไม่ unmount) และ cleanup effect ตอนซ่อน
 * → state ของการเข้าหน้าแต่ละครั้ง (การสแกน) ต้องเริ่มใหม่ใน effect ไม่ใช่ตอน mount
 */
export function LockScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { bfcacheId } = router;
  const { data: deal } = useDeal(id);
  const { data: me } = useMe();
  const lock = useLockDeal();
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [attempt, setAttempt] = useState(0);
  const scanStartedAt = useRef(0);

  const waiting = deal?.state === "WAITING_ACCEPT";

  // สแกนทุกครั้งที่หน้าแสดงและดีลยังรอกันเงิน (หรือกดลองใหม่)
  useEffect(() => {
    if (!deal || !waiting) return;
    scanStartedAt.current = Date.now();
    const reset = setTimeout(() => setPhase("scanning"), 0);
    const scan = setTimeout(() => {
      setPhase("success");
      navigator.vibrate?.(15);
      lock.mutate(deal, { onError: () => setPhase("error") });
    }, SCAN_MS);
    return () => {
      clearTimeout(reset);
      clearTimeout(scan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เริ่มใหม่เฉพาะเมื่อเปลี่ยนดีล/สถานะ หรือกดลองใหม่
  }, [deal?.id, waiting, attempt]);

  // กันเงินแล้ว (สำเร็จจากการสแกนนี้ หรือกลับมาหน้านี้ภายหลัง) → ไป T4
  const locked = deal?.state === "FUNDS_LOCKED";
  useEffect(() => {
    if (!locked) return;
    const wait = Math.max(0, MIN_TOTAL_MS - (Date.now() - scanStartedAt.current));
    const t = setTimeout(() => router.replace(`/deals/${id}/locked`), wait);
    return () => clearTimeout(t);
  }, [locked, id, router]);

  if (!deal || !me) return <ScreenSkeleton />;

  return (
    <LockView
      key={bfcacheId}
      amountSatang={deal.amounts.totalSatang}
      accountType={me.account.accountType}
      accountNoMasked={me.account.accountNoMasked}
      phase={locked ? "success" : phase}
      pending={lock.isPending}
      onClose={() => router.back()}
      onUsePin={() => toast.success("PIN pad (D2) จะเปิดใช้ใน Phase 8")}
      onRetry={() => setAttempt((a) => a + 1)}
    />
  );
}
