import { cn } from "@/lib/cn";

/** แถบขั้นตอน 2 ขั้นใต้ header L2/L3 (Figma: สูง 44 · pad 4/20/14/20 · gap 6 · เส้น 3px r2 · ป้าย 11px) */
export function StepTabs({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex gap-1.5 px-5 pt-1 pb-3.5">
      {steps.map((label, i) => {
        const reached = i <= current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-[7px]" aria-current={i === current ? "step" : undefined}>
            <span className={cn("h-[3px] rounded-[2px]", reached ? "bg-neon" : "bg-line")} />
            <span
              className={cn(
                "text-micro",
                i === current ? "font-semibold text-white" : reached ? "text-gray" : "text-muted",
              )}
            >
              {i + 1}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
