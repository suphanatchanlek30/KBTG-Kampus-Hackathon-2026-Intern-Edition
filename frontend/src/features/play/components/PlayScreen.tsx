"use client";

import { ChevronRight, House, KeyRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { demoLogin, hardNavigate, startSandbox } from "@/features/auth/api";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/api";

const ROLES: { role: Role; title: string; hint: string; icon: typeof House }[] = [
  { role: "LANDLORD", title: "ผู้ให้เช่า", hint: "สร้างดีลและส่งคำขอให้ผู้เช่า", icon: House },
  { role: "TENANT", title: "ผู้เช่า", hint: "ได้รับคำขอมัดจำห้องจากผู้ให้เช่า", icon: KeyRound },
];

/** Entry point for visitors: pick a role, get a private sandbox, and start that role's flow from home. */
export function PlayScreen() {
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState<unknown>(null);

  const start = async (role: Role) => {
    setPending(role);
    setError(null);
    try {
      if (env.useMock) {
        await demoLogin(role);
        return hardNavigate("/home");
      }
      // A landlord starts with no deal yet; a tenant starts with the landlord's request waiting.
      await startSandbox(role === "LANDLORD" ? "fresh" : "waiting_accept");
      if (role === "LANDLORD") await demoLogin("LANDLORD"); // Stays inside the new sandbox.
      hardNavigate("/home");
    } catch (err) {
      setError(err);
      setPending(null);
    }
  };

  return (
    <AppShell enter="fade" className="flex flex-col gap-6 px-5 pt-16 pb-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image src={brand.logo.src} alt={brand.name} width={168} height={53} loading="eager" />
        <p className="text-body text-gray">{brand.tagline}</p>
        <DemoBadge />
      </div>

      <section className="flex flex-col gap-2.5">
        <h1 className="text-section">อยากลองเป็นใคร?</h1>
        <p className="text-caption text-muted">
          คุณจะได้ห้องเล่นส่วนตัว ไม่มีใครเห็นหรือกระทบสิ่งที่คุณทำ · สลับบทบาทได้ภายหลังจากเมนูเดโม
        </p>
        {ROLES.map(({ role, title, hint, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={pending !== null}
            onClick={() => start(role)}
            aria-busy={pending === role || undefined}
            className={cn(
              "flex items-center gap-3 rounded-card bg-card p-4 text-left transition-[transform,opacity] active:scale-[0.98]",
              pending !== null && pending !== role && "opacity-50",
            )}
          >
            <span className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-neon/9 text-neon">
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-row-title">{title}</span>
              <span className="text-caption text-muted">
                {pending === role ? "กำลังเตรียมห้องเล่นส่วนตัว…" : hint}
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />
          </button>
        ))}
        {error != null && (
          <p role="alert" className="text-caption text-warn">
            เปิดห้องเล่นไม่สำเร็จ · {errorMessage(error)}
          </p>
        )}
      </section>
    </AppShell>
  );
}
