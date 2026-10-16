"use client";

import { Delete } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/**
 * D2 — PIN pad จำลอง 6 หลัก: รับเลขอะไรก็ได้ ไม่ส่งไป server ไม่เก็บ (docs/03-architecture.md §4)
 * ครบ 6 หลักแล้วเรียก onComplete (ไม่ส่งค่า PIN ออกไป)
 */
export function PinPad({ onComplete, disabled = false }: { onComplete: () => void; disabled?: boolean }) {
  const [count, setCount] = useState(0);

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === "del") return setCount((c) => Math.max(0, c - 1));
    if (!key || count >= LENGTH) return;
    navigator.vibrate?.(8);
    const next = count + 1;
    setCount(next);
    if (next === LENGTH) onComplete();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3" aria-label={`ใส่แล้ว ${count} จาก ${LENGTH} หลัก`} role="status">
        {Array.from({ length: LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border border-stroke transition-colors",
              i < count && "border-neon bg-neon",
            )}
          />
        ))}
      </div>
      <div className="grid w-full max-w-[300px] grid-cols-3 gap-2.5">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === "del" ? "ลบ" : key}
              className="flex h-14 items-center justify-center rounded-2xl bg-card2 text-title-sm transition-transform active:scale-[0.94] disabled:opacity-50"
            >
              {key === "del" ? <Delete size={20} strokeWidth={1.5} /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
