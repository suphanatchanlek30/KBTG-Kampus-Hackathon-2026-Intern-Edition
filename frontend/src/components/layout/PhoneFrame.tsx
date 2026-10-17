import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Toaster } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type PhoneFrameProps = {
  children: ReactNode;
  forceFrame?: boolean;
  aside?: ReactNode;
  className?: string;
};

export function PhoneFrame({ children, forceFrame, aside, className }: PhoneFrameProps) {
  return (
    <div
      data-frame={forceFrame ? "force" : undefined}
      className="min-h-dvh bg-bg md:gap-10 md:p-8 framed:flex framed:items-center framed:justify-center framed:bg-white"
    >
      <div
        data-phone-scope
        className={cn(
          "relative mx-auto flex h-dvh w-full max-w-[430px] transform-gpu flex-col overflow-hidden bg-bg",
          "framed:mx-0 framed:w-[393px] framed:max-w-none framed:shrink-0 framed:rounded-frame framed:shadow-phone",
          forceFrame ? "framed:h-[852px]" : "framed:h-[min(852px,calc(100dvh-4rem))]",
          className,
        )}
      >
        {children}
        <div data-phone-overlay />
        <Toaster />
      </div>
      {!forceFrame && (
        <aside className="hidden w-56 flex-col gap-4 md:flex">
          <DemoBadge className="border-warn/70 bg-warn/15 text-[#8a5a00]" />
          {aside}
        </aside>
      )}
    </div>
  );
}
