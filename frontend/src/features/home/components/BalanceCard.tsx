"use client";

import { ArrowUpDown, Download, Eye, EyeOff, Landmark, List } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { MintCardDecor } from "@/components/ui/MintCardDecor";
import { formatBaht } from "@/lib/format/money";
import type { AccountDTO } from "@/types/api";

const ACTIONS = [
  { label: "โอนเงิน", icon: ArrowUpDown, href: "/transfer" },
  { label: "เติมเงิน", icon: Download, href: "/home" },
  { label: "รายการ", icon: List, href: "/home" },
] as const;

/** การ์ดยอดเงิน L1/T1 (Figma: 353×187 · r28 · grad-mint · pad 20) */
export function BalanceCard({ account }: { account: AccountDTO }) {
  const [hidden, setHidden] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-card-xl bg-grad-mint p-5 text-ink-mint shadow-mint">
      <MintCardDecor />

      <div className="relative flex h-5 items-center gap-1.5">
        <Landmark size={14} strokeWidth={1.17} />
        <span className="text-caption">
          บัญชี{account.accountType} · {account.accountNoMasked}
        </span>
        <Badge variant="dark" className="ml-auto">
          หลัก
        </Badge>
      </div>

      <p className="relative mt-3 text-caption">ยอดเงินที่ใช้ได้</p>
      <div className="relative mt-px flex items-center gap-2">
        <span className="text-amount-balance text-ink tabular-nums">
          {hidden ? "••••••" : formatBaht(account.availableSatang, 2)}
        </span>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "แสดงยอดเงิน" : "ซ่อนยอดเงิน"}
          aria-pressed={hidden}
          className="rounded-full p-0.5"
        >
          {hidden ? <EyeOff size={17} strokeWidth={1.42} /> : <Eye size={17} strokeWidth={1.42} />}
        </button>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        {ACTIONS.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="flex h-[38px] items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/50 text-body font-medium text-ink transition-transform active:scale-[0.97]"
          >
            <Icon size={14} strokeWidth={1.28} />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
