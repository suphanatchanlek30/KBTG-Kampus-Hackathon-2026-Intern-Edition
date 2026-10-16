"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { env } from "@/config/env";
import { useMe } from "@/features/deals/hooks";
import { cn } from "@/lib/cn";
import { mockApi, type MockScenario } from "@/mocks/handlers";
import type { Role } from "@/types/api";

const SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "invited", label: "ส่งคำขอแล้ว (รอผู้เช่า)" },
  { id: "locked", label: "กันเงินแล้ว" },
  { id: "booking-released", label: "ปล่อยค่าจองแล้ว" },
  { id: "released", label: "ปล่อยครบแล้ว" },
  { id: "fresh", label: "ยังไม่มีดีล" },
];

/**
 * สลับ role / รีเซ็ตข้อมูล mock — ใช้ทั้งแผงข้างกรอบโทรศัพท์ (desktop) และ sheet จากปุ่มเมนูหน้าหลัก (มือถือ)
 * `large` = ขนาดปุ่มสำหรับนิ้วบนมือถือ
 */
function DemoControls({ large = false, onDone }: { large?: boolean; onDone?: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const role = useMe().data?.user.role;

  // ล้าง cache ทั้งหมด (ไม่ใช่แค่ invalidate) — หน้าที่ค้างอยู่ใน <Activity> จะโหลดข้อมูลใหม่เสมอเมื่อกลับมาแสดง
  // กันกรณีกดรีเซ็ตเร็วระหว่างที่ mutation ก่อนหน้ายัง invalidate ไม่เสร็จ แล้วหน้าหลักค้างข้อมูลเก่า
  const switchRole = (next: Role) => {
    mockApi.setRole(next);
    void qc.resetQueries();
    onDone?.();
    router.push("/home");
  };

  const reset = (scenario: MockScenario) => {
    mockApi.reset(scenario);
    void qc.resetQueries();
    onDone?.();
    router.push("/home");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-card2 p-1">
        {(["LANDLORD", "TENANT"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            aria-pressed={role === r}
            className={cn(
              "rounded-lg",
              large ? "px-3 py-2.5 text-section" : "px-2 py-1.5",
              role === r ? "bg-neon font-semibold text-ink" : "text-gray",
            )}
          >
            {r === "LANDLORD" ? "ผู้ให้เช่า" : "ผู้เช่า"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <p className={cn("text-muted", large ? "text-caption" : "text-micro")}>รีเซ็ตดีลเป็น</p>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => reset(s.id)}
            className={cn(
              "rounded-lg text-left text-gray hover:bg-card2 hover:text-white active:bg-card2",
              large ? "px-3 py-2.5 text-body" : "px-2 py-1",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * Demo tools ข้างกรอบโทรศัพท์ (desktop) — สลับ role / รีเซ็ตข้อมูล mock
 * มือถือกดปุ่มเมนูที่หน้าหลัก (DemoMenuSheet) หรือใช้ /home?as=tenant หรือ ?as=landlord
 */
export function DemoTools() {
  const qc = useQueryClient();

  useEffect(() => {
    // อ่าน ?as= ตอน mount (ฝั่ง client เท่านั้น) — แผงนี้ซ่อนบนมือถือแต่ยัง mount อยู่ จึงใช้ได้ทุกขนาดจอ
    const as = new URLSearchParams(window.location.search).get("as");
    if (as === "tenant" || as === "landlord") {
      mockApi.setRole(as === "tenant" ? "TENANT" : "LANDLORD");
      void qc.resetQueries();
    }
  }, [qc]);

  if (!env.useMock) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 text-caption">
      <p className="text-card-title">Demo tools</p>
      <DemoControls />
    </div>
  );
}

/** Sheet จากปุ่มเมนูหน้าหลัก — ให้สลับ role / รีเซ็ตบนมือถือจริงได้ (เฉพาะโหมด mock) */
export function DemoMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!env.useMock) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title="โหมดทดลอง">
      <DemoControls large onDone={onClose} />
    </BottomSheet>
  );
}
