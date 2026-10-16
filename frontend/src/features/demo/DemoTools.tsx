"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
 * Demo tools ข้างกรอบโทรศัพท์ (desktop) — สลับ role / รีเซ็ตข้อมูล mock
 * มือถือใช้ /home?as=tenant หรือ ?as=landlord แทน
 */
export function DemoTools() {
  const qc = useQueryClient();
  const router = useRouter();
  const role = useMe().data?.user.role;

  useEffect(() => {
    // อ่าน ?as= ตอน mount (ฝั่ง client เท่านั้น) — ใช้สลับ role บนมือถือที่ไม่มีแผงนี้
    const as = new URLSearchParams(window.location.search).get("as");
    if (as === "tenant" || as === "landlord") {
      mockApi.setRole(as === "tenant" ? "TENANT" : "LANDLORD");
      void qc.invalidateQueries();
    }
  }, [qc]);

  if (!env.useMock) return null;

  const switchRole = (next: Role) => {
    mockApi.setRole(next);
    void qc.invalidateQueries();
    router.push("/home");
  };

  const reset = (scenario: MockScenario) => {
    mockApi.reset(scenario);
    void qc.invalidateQueries();
    router.push("/home");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 text-caption">
      <p className="text-card-title">Demo tools</p>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-card2 p-1">
        {(["LANDLORD", "TENANT"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            aria-pressed={role === r}
            className={cn("rounded-lg px-2 py-1.5", role === r ? "bg-neon font-semibold text-ink" : "text-gray")}
          >
            {r === "LANDLORD" ? "ผู้ให้เช่า" : "ผู้เช่า"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-micro text-muted">รีเซ็ตดีลเป็น</p>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => reset(s.id)}
            className="rounded-lg px-2 py-1 text-left text-gray hover:bg-card2 hover:text-white"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
