import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Rule = { icon: LucideIcon; text: ReactNode };

export function RulesList({
  rules,
  className,
  tone = "dark",
}: {
  rules: Rule[];
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <ul className={cn("flex flex-col gap-[9px]", className)}>
      {rules.map(({ icon: Icon, text }, i) => (
        <li key={i} className="flex gap-2">
          <span className={cn("pt-0.5", tone === "light" ? "text-warn-edge" : "text-muted")}>
            <Icon size={14} strokeWidth={1.4} />
          </span>
          <span className={cn("text-caption leading-[18px]", tone === "light" ? "text-ink-2" : "text-gray")}>
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
