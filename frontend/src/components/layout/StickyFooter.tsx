import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] framed:pb-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
