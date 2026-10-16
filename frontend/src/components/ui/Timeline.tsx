import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TimelineItem = {
  key: string;
  title: ReactNode;
  detail: ReactNode;
  status: "done" | "current" | "upcoming";
};

/**
 * ไทม์ไลน์ดีล L5 (Figma: แถวสูง 48 · วงกลม 20 r10 · เส้น 1.5×24 · gap 12 · ชื่อ 13.5/600 · รายละเอียด 12 muted)
 * done = วงเขียวมีถูก · current = วงขอบเขียวจุดกลาง · upcoming = วงขอบเทา
 */
export function Timeline({ title, items }: { title: ReactNode; items: TimelineItem[] }) {
  return (
    <section className="flex flex-col rounded-card bg-card p-4">
      <h2 className="pb-3 text-card-title">{title}</h2>
      <ol className="flex flex-col">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.key} className="flex gap-3" aria-current={item.status === "current" ? "step" : undefined}>
              <div className="flex w-5 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    item.status === "done" && "border-neon bg-neon text-ink",
                    item.status === "current" && "border-neon bg-card",
                    item.status === "upcoming" && "border-dim bg-card",
                  )}
                >
                  {item.status === "done" && <Check size={11} strokeWidth={2.4} />}
                  {item.status === "current" && <span className="size-2 rounded-full bg-neon" />}
                </span>
                {!last && (
                  <span className="py-0.5">
                    <span className={cn("block h-6 w-[1.5px]", item.status === "done" ? "bg-neon" : "bg-line")} />
                  </span>
                )}
              </div>
              <div className={cn("flex min-w-0 flex-col", !last && "pb-1.5")}>
                <span className="pt-1 text-row-title">{item.title}</span>
                <span className="text-caption text-muted">{item.detail}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
