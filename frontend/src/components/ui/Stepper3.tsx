import { Check, Eye, Key, Lock, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StepStatus = "done" | "current" | "upcoming";
type Statuses = [StepStatus, StepStatus, StepStatus];

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "กันเงิน", icon: Lock },
  { label: "ดูห้อง", icon: Eye },
  { label: "เข้าอยู่", icon: Key },
];

/**
 * แถว stepper 3 ขั้น (Figma: วงกลม 34 r17 · ป้าย 11px · เส้น 1.5px ที่ y+16)
 * done = เขียวมีถูก · current = ขอบเขียวพื้น neon/12 · upcoming = ขอบ line พื้นดำ
 * tone="light" ใช้บนการ์ดขาว (T7): ป้ายสี ink-2 · เส้นที่ผ่านแล้วสีดำ
 */
export function StepperRow({ statuses, tone = "dark" }: { statuses: Statuses; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div className="flex" aria-label="ขั้นตอนของดีล">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const status = statuses[i];
        const lineDone = i > 0 && statuses[i - 1] === "done" && status !== "upcoming";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span className="flex-1 pt-4" aria-hidden>
                <span className={cn("block h-[1.5px]", lineDone ? (light ? "bg-ink" : "bg-neon") : "bg-line")} />
              </span>
            )}
            <div
              className="flex w-14 flex-col items-center gap-[5px]"
              aria-current={status === "current" ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-[34px] items-center justify-center rounded-full border",
                  status === "done" && "border-neon bg-neon text-ink",
                  status === "current" && "border-neon bg-neon/12 text-neon",
                  status === "upcoming" && "border-line bg-ink text-muted",
                )}
              >
                {status === "done" ? <Check size={16} strokeWidth={2.4} /> : <Icon size={15} strokeWidth={1.6} />}
              </span>
              <span
                className={cn(
                  "text-micro",
                  status === "done" && (light ? "text-ink-2" : "text-gray"),
                  status === "current" && "font-semibold text-neon",
                  status === "upcoming" && "text-muted",
                )}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Stepper ในการ์ดมืด T4/T6 (Figma: การ์ด r20 pad 16 gap 10) — children = เนื้อหาใต้ stepper (T6) */
export function Stepper3({ statuses, children }: { statuses: Statuses; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
      <StepperRow statuses={statuses} />
      {children}
    </section>
  );
}
