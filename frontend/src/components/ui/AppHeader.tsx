"use client";

import { ChevronLeft, Menu, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

type AppHeaderProps = {
  title?: ReactNode;
  left?: "back" | "close" | "none";
  right?: "menu" | "share" | "none";
  onLeft?: () => void;
  onRight?: () => void;
  className?: string;
};

const LEFT = {
  back: { icon: <ChevronLeft size={18} strokeWidth={1.65} />, label: "ย้อนกลับ" },
  close: { icon: <X size={18} strokeWidth={1.65} />, label: "ปิด" },
} as const;

const RIGHT = {
  menu: { icon: <Menu size={17} strokeWidth={1.42} />, label: "เมนู" },
  share: { icon: <Share2 size={17} strokeWidth={1.42} />, label: "แชร์" },
} as const;

export function AppHeader({ title, left = "back", right = "none", onLeft, onRight, className }: AppHeaderProps) {
  const router = useRouter();
  const spacer = <span aria-hidden className="size-[38px] shrink-0" />;

  return (
    <header className={cn("flex h-[52px] items-center justify-between gap-3 px-5", className)}>
      {left === "none" ? (
        spacer
      ) : (
        <IconButton aria-label={LEFT[left].label} onClick={onLeft ?? (() => router.back())}>
          {LEFT[left].icon}
        </IconButton>
      )}
      <h1 className="min-w-0 flex-1 truncate text-center text-header">{title}</h1>
      {right === "none" ? (
        spacer
      ) : (
        <IconButton aria-label={RIGHT[right].label} onClick={onRight}>
          {RIGHT[right].icon}
        </IconButton>
      )}
    </header>
  );
}
