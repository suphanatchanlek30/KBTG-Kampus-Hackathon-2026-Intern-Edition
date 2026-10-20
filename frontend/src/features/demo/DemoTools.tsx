"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { env } from "@/config/env";
import { demoLogin, demoReset, hardNavigate, logout } from "@/features/auth/api";
import { getHome } from "@/features/deals/api";
import { queryKeys, useExpireNow, useMe } from "@/features/deals/hooks";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { MockScenario } from "@/mocks/handlers";
import type { Role } from "@/types/api";

const SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "invited", label: "ส่งคำขอแล้ว (รอผู้เช่า)" },
  { id: "locked", label: "กันเงินแล้ว" },
  { id: "booking-released", label: "ปล่อยค่าจองแล้ว" },
  { id: "released", label: "ปล่อยครบแล้ว" },
  { id: "fresh", label: "ยังไม่มีดีล" },
];

function DemoControls({ large = false, onDone }: { large?: boolean; onDone?: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const me = useMe().data;
  const role = hydrated ? me?.user.role : undefined;
  const inSandbox = hydrated && me?.user.sandbox === true;
  const expire = useExpireNow();

  const expireNow = async () => {
    const home = await qc.fetchQuery({ queryKey: queryKeys.home, queryFn: getHome }).catch(() => null);
    const id = home?.activeDeals[0]?.dealId ?? home?.pendingInvites[0]?.dealId;
    if (!id) return toast.error("ไม่มีดีลที่ยังไม่จบ");
    expire.mutate(id, {
      onSuccess: (deal) => {
        onDone?.();
        router.push(`/deals/${deal.id}/result`);
      },
    });
  };

  const switchRole = async (next: Role) => {
    try {
      await demoLogin(next);
    } catch (err) {
      return toast.error(errorMessage(err));
    }
    onDone?.();
    hardNavigate("/home");
  };

  const reset = async (scenario: MockScenario) => {
    try {
      await demoReset(scenario);
    } catch (err) {
      return toast.error(errorMessage(err));
    }
    void qc.resetQueries();
    onDone?.();
    router.push("/home");
  };

  const signOut = async () => {
    await logout().catch(() => undefined);
    // A sandbox visitor starts a fresh sandbox; everyone else returns to the shared login.
    hardNavigate(inSandbox ? "/play" : "/login");
  };

  return (
    <>
      {inSandbox && (
        <p
          className={cn("rounded-lg bg-neon/9 text-neon", large ? "px-3 py-2 text-caption" : "px-2 py-1.5 text-micro")}
        >
          ห้องเล่นส่วนตัวของคุณ · รีเซ็ตหรือลองอะไรก็ได้ ไม่กระทบคนอื่น
        </p>
      )}
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
      <button
        type="button"
        disabled={expire.isPending}
        onClick={expireNow}
        className={cn(
          "rounded-lg text-left text-warn hover:bg-card2 disabled:text-muted disabled:opacity-60",
          large ? "px-3 py-2.5 text-body" : "px-2 py-1",
        )}
      >
        ให้ดีลหมดอายุตอนนี้ (คืนเงินอัตโนมัติ)
      </button>
      {!env.useMock && (
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "flex items-center gap-2 rounded-lg text-left text-muted hover:bg-card2 hover:text-white",
            large ? "px-3 py-2.5 text-body" : "px-2 py-1",
          )}
        >
          <LogOut size={large ? 16 : 13} strokeWidth={1.5} />
          {inSandbox ? "เริ่มห้องเล่นใหม่" : "ออกจากระบบ"}
        </button>
      )}
    </>
  );
}

export function DemoTools() {
  const qc = useQueryClient();

  useEffect(() => {
    const as = new URLSearchParams(window.location.search).get("as");
    if (as !== "tenant" && as !== "landlord") return;
    void demoLogin(as === "tenant" ? "TENANT" : "LANDLORD").then(() =>
      env.useMock ? qc.resetQueries() : hardNavigate(window.location.pathname),
    );
  }, [qc]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 text-caption">
      <p className="text-card-title">Demo tools</p>
      <DemoControls />
    </div>
  );
}

export function DemoMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="โหมดทดลอง">
      <DemoControls large onDone={onClose} />
    </BottomSheet>
  );
}
