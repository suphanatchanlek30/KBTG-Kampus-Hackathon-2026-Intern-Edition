"use client";

import { ArrowUpDown, Download, Eye, EyeOff, Landmark, List, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { useMotionMode } from "@/components/motion/MotionMode";
import { Badge } from "@/components/ui/Badge";
import { MintCardDecor } from "@/components/ui/MintCardDecor";
import { formatBaht } from "@/lib/format/money";
import type { AccountDTO } from "@/types/api";

const ACTIONS: { label: string; icon: LucideIcon; href?: string }[] = [
  { label: "โอนเงิน", icon: ArrowUpDown, href: "/transfer" },
  { label: "เติมเงิน", icon: Download },
  { label: "รายการ", icon: List },
];

const ACTION_CLASS =
  "flex h-[38px] items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/50 text-body font-medium text-ink transition-transform active:scale-[0.97]";

const COUNTED_KEY = "ks-balance-counted";
const balanceCounted = () => {
  try {
    return sessionStorage.getItem(COUNTED_KEY) === "1";
  } catch {
    return true;
  }
};

export function BalanceCard({ account }: { account: AccountDTO }) {
  const full = useMotionMode() === "full";
  const [hidden, setHidden] = useState(false);
  const [toggles, setToggles] = useState(0);
  const [countUp] = useState(() => typeof window !== "undefined" && !balanceCounted());
  const counting = full && countUp;

  useEffect(() => {
    if (!counting) return;
    try {
      sessionStorage.setItem(COUNTED_KEY, "1");
    } catch {
    }
  }, [counting]);

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
        <motion.span
          key={hidden ? "hidden" : "shown"}
          className="text-amount-balance text-ink tabular-nums"
          initial={full && toggles > 0 ? { opacity: 0, filter: "blur(4px)" } : false}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.2 }}
        >
          {hidden ? (
            "••••••"
          ) : counting && toggles === 0 ? (
            <CountUp satang={account.availableSatang} duration={0.6} />
          ) : (
            formatBaht(account.availableSatang, 2)
          )}
        </motion.span>
        <button
          type="button"
          onClick={() => {
            setHidden((h) => !h);
            setToggles((t) => t + 1);
          }}
          aria-label={hidden ? "แสดงยอดเงิน" : "ซ่อนยอดเงิน"}
          aria-pressed={hidden}
          className="rounded-full p-0.5"
        >
          {hidden ? <EyeOff size={17} strokeWidth={1.42} /> : <Eye size={17} strokeWidth={1.42} />}
        </button>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        {ACTIONS.map(({ label, icon: Icon, href }) =>
          href ? (
            <Link key={label} href={href} className={ACTION_CLASS}>
              <Icon size={14} strokeWidth={1.28} />
              {label}
            </Link>
          ) : (
            <button key={label} type="button" className={ACTION_CLASS}>
              <Icon size={14} strokeWidth={1.28} />
              {label}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
