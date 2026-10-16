import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type CheckListProps = {
  items: string[];
  checked: boolean[];
  onToggle?: (index: number) => void;
};

/** เช็กลิสต์ T5/T6 (Figma: การ์ด r20 pad16 gap13 · กล่องติ๊ก 22 r11 · ข้อความ 13.5/500) */
export function CheckList({ items, checked, onToggle }: CheckListProps) {
  return (
    <ul className="flex flex-col gap-[13px] rounded-card bg-card p-4">
      {items.map((label, i) => (
        <li key={label}>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked[i] ?? false}
              onChange={() => onToggle?.(i)}
            />
            <span
              aria-hidden
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neon",
                checked[i] ? "border-neon bg-neon text-ink" : "border-stroke bg-transparent text-transparent",
              )}
            >
              <Check size={13} strokeWidth={2.6} />
            </span>
            <span className="text-check-item">{label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
