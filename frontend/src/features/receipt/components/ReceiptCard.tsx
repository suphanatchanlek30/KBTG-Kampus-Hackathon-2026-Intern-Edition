import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Fragment } from "react";

export type ReceiptLine = { key: string; title: string; detail: string; amount: string };
export type ReceiptField = { label: string; value: ReactNode };

type ReceiptCardProps = {
  header: ReactNode;
  lines: ReceiptLine[];
  fields: ReceiptField[];
};

/**
 * การ์ดหลักฐานสีขาว L6/T7 (Figma: r20 pad 16 gap 10 · แถวรายการ 36 · เส้นแบ่ง #E6E8EB · key/value 12.5)
 * header = โลโก้ + "หลักฐานดีล" (L6) หรือ stepper (T7)
 */
export function ReceiptCard({ header, lines, fields }: ReceiptCardProps) {
  return (
    <section className="flex w-full flex-col gap-2.5 rounded-card bg-white p-4 text-ink">
      {header}
      {lines.map((line) => (
        <div key={line.key} className="flex h-9 items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neon">
            <Check size={13} strokeWidth={2.4} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-row-title">{line.title}</span>
            <span className="text-micro text-ink-2">{line.detail}</span>
          </div>
          <span className="text-row-title tabular-nums">{line.amount}</span>
        </div>
      ))}
      <hr className="border-divider-light" />
      <dl className="flex flex-col gap-2.5 text-meta">
        {fields.map((f) => (
          <Fragment key={f.label}>
            <div className="flex h-[19px] items-center justify-between gap-3">
              <dt className="text-ink-2">{f.label}</dt>
              <dd className="text-right font-medium">{f.value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
