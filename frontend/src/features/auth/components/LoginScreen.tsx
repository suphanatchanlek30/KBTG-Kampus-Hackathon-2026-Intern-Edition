"use client";

import { ChevronRight, KeyRound, House } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { toast } from "@/components/ui/Toast";
import { brand } from "@/config/brand";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/api";
import { demoLogin, hardNavigate } from "../api";

const ACCOUNTS: { role: Role; title: string; name: string; icon: typeof House }[] = [
  { role: "LANDLORD", title: "ผู้ให้เช่า", name: "สมชาย ใจดี", icon: House },
  { role: "TENANT", title: "ผู้เช่า", name: "ณัฐธิดา ศรีสุข", icon: KeyRound },
];

export function LoginScreen() {
  const [pending, setPending] = useState<Role | null>(null);

  const login = async (role: Role) => {
    setPending(role);
    try {
      await demoLogin(role);
      hardNavigate("/home");
    } catch (err) {
      toast.error(errorMessage(err));
      setPending(null);
    }
  };

  return (
    <AppShell enter="fade" className="flex flex-col gap-6 px-5 pt-16 pb-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image src={brand.logo.src} alt={brand.name} width={168} height={52} loading="eager" />
        <p className="text-body text-gray">{brand.tagline}</p>
        <DemoBadge />
      </div>

      <section className="flex flex-col gap-2.5">
        <h1 className="text-section">เข้าสู่ระบบเดโม</h1>
        <p className="text-caption text-muted">เลือกบัญชีที่จะใช้ · เปิดอีกเครื่องแล้วเลือกอีกบัญชีเพื่อเดโม 2 ฝั่ง</p>
        {ACCOUNTS.map(({ role, title, name, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={pending !== null}
            onClick={() => login(role)}
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
              <span className="text-caption text-muted">{name}</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />
          </button>
        ))}
      </section>
    </AppShell>
  );
}
