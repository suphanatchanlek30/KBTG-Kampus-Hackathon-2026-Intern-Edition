import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Rule = { icon: LucideIcon; text: ReactNode };

/** รายการกติกา L3/T2 (Figma: ไอคอน 14 ในกล่อง 14×16 pad-top 2 · gap 8 · ข้อความ 12/18 gray) */
export function RulesList({ rules, className }: { rules: Rule[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-[9px]", className)}>
      {rules.map(({ icon: Icon, text }, i) => (
        <li key={i} className="flex gap-2">
          <span className="pt-0.5 text-muted">
            <Icon size={14} strokeWidth={1.4} />
          </span>
          <span className="text-caption leading-[18px] text-gray">{text}</span>
        </li>
      ))}
    </ul>
  );
}
