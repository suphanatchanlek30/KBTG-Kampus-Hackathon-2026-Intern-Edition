"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { env } from "@/config/env";
import { demoLogin, hardNavigate, startSandbox } from "@/features/auth/api";
import { errorMessage } from "@/lib/api/errors";

/** Entry point for event visitors: gives this device its own sandbox, then opens the invitation. */
export function PlayScreen() {
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);

  const start = async () => {
    setError(null);
    try {
      if (env.useMock) {
        await demoLogin("TENANT");
        return hardNavigate("/home");
      }
      const sandbox = await startSandbox("waiting_accept");
      hardNavigate(sandbox.shareCode ? `/invites/${encodeURIComponent(sandbox.shareCode)}` : "/home");
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    if (started.current) return; // React may run effects twice in development.
    started.current = true;
    void start();
  }, []);

  if (error) {
    return (
      <AppShell
        footer={
          <div className="px-5 pb-2">
            <Button onClick={start}>ลองอีกครั้ง</Button>
          </div>
        }
        className="flex flex-col items-center justify-center gap-2 px-8 text-center"
      >
        <p className="text-title-sm">เปิดห้องเล่นไม่สำเร็จ</p>
        <p className="text-body text-gray">{errorMessage(error)}</p>
      </AppShell>
    );
  }

  return (
    <AppShell className="flex flex-col gap-3 px-5 pt-[56px] pb-2">
      <p className="text-body text-gray" role="status">
        กำลังเตรียมห้องเล่นส่วนตัวของคุณ…
      </p>
      <Skeleton className="h-[220px] rounded-card" />
      <Skeleton className="h-[140px] rounded-card" />
    </AppShell>
  );
}
