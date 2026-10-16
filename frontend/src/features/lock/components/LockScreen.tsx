"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PinPad } from "@/components/ui/PinPad";
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
  const { data: deal, error } = useDeal(id);
  const { data: me } = useMe();
  const lock = useLockDeal();
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [attempt, setAttempt] = useState(0);
  // D2 — ใช้ PIN แทน: หยุดสแกนใบหน้า แล้วยืนยันด้วย PIN pad
  const [pinOpen, setPinOpen] = useState(false);
  const scanStartedAt = useRef(0);

  const waiting = deal?.state === "WAITING_ACCEPT";

  // สแกนทุกครั้งที่หน้าแสดงและดีลยังรอกันเงิน (หรือกดลองใหม่)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เริ่มใหม่เฉพาะเมื่อเปลี่ยนดีล/สถานะ หรือกดลองใหม่
  }, [deal?.id, waiting, attempt, pinOpen]);

  // กันเงินแล้ว (สำเร็จจากการสแกนนี้ หรือกลับมาหน้านี้ภายหลัง) → ไป T4
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
              { onError: () => setAttempt((a) => a + 1) }, // ล้างจุดให้ใส่ใหม่
            )
          }
        />
      </BottomSheet>
    </>
  );
}
