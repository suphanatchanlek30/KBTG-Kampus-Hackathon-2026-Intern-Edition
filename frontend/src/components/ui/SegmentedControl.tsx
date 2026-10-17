"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Segment<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange?: (value: T) => void;
  "aria-label": string;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex h-12 gap-1 rounded-full bg-card p-1">
      {segments.map((s) => {
        const selected = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(s.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full text-body",
              selected ? "font-semibold text-ink" : "text-gray",
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={cn("relative", selected && "text-neon")}>{s.icon}</span>
            <span className="relative">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
