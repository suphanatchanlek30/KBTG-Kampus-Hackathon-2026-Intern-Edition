"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useEnter, useMotionMode } from "@/components/motion/MotionMode";
import { SPRING_CARD, SPRING_DOT } from "@/components/motion/tokens";

export type ReceiptLine = { key: string; title: string; detail: string; amount: string };
export type ReceiptField = { label: string; value: ReactNode };

type ReceiptCardProps = {
  header: ReactNode;
  lines: ReceiptLine[];
  fields: ReceiptField[];
};

const CARD_AT = 0.85;
const ROWS_AT = 0.95;
const ROW_STAGGER = 0.06;

export function ReceiptCard({ header, lines, fields }: ReceiptCardProps) {
  const enter = useEnter();
  const full = useMotionMode() === "full";
  const row = (i: number) => enter(ROWS_AT + i * ROW_STAGGER, { y: 8, duration: 0.35 });

  return (
    <motion.section
      data-export="proof"
      className="flex w-full flex-col gap-2.5 rounded-card bg-white p-4 text-ink"
      {...enter(CARD_AT, { y: 40, spring: SPRING_CARD })}
    >
      {header}
      {lines.map((line, i) => (
        <motion.div key={line.key} className="flex h-9 items-center gap-2.5" {...row(i)}>
          <motion.span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neon"
            {...(full && {
              initial: { scale: 0 },
              animate: { scale: 1 },
              transition: { ...SPRING_DOT, delay: ROWS_AT + i * ROW_STAGGER + 0.1 },
            })}
          >
            <Check size={13} strokeWidth={2.4} />
          </motion.span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-row-title">{line.title}</span>
            <span className="text-micro text-ink-2">{line.detail}</span>
          </div>
          <span className="text-row-title tabular-nums">{line.amount}</span>
        </motion.div>
      ))}
      <hr className="border-divider-light" />
      <dl className="flex flex-col gap-2.5 text-meta">
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            className="flex h-[19px] items-center justify-between gap-3"
            {...row(lines.length + i)}
          >
            <dt className="text-ink-2">{f.label}</dt>
            <dd className="text-right font-medium">{f.value}</dd>
          </motion.div>
        ))}
      </dl>
    </motion.section>
  );
}
