import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  suffix?: ReactNode;
  /** ช่องที่กำลังแก้ (ขอบ neon) */
  active?: boolean;
  /** ช่องยอดเงินสูง 56 (ปกติ 48) */
  large?: boolean;
  className?: string;
  htmlFor?: string;
};

/** label + กล่องกรอก (Figma L2: label 12 muted · gap 6 · กล่อง r14 bg #0A0A0B ขอบ line · pad 0/14 · gap 10) */
export function FormField({ label, icon, children, suffix, active, large, className, htmlFor }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-caption text-muted">
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center gap-2.5 rounded-tile border bg-ink px-3.5 transition-colors focus-within:border-neon",
          large ? "h-14" : "h-12",
          active ? "border-neon" : "border-line",
        )}
      >
        {icon && <span className={cn("shrink-0", active ? "text-neon" : "text-gray")}>{icon}</span>}
        <div className="relative flex min-w-0 flex-1 items-center">{children}</div>
        {suffix && <span className="shrink-0 text-body font-medium text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
