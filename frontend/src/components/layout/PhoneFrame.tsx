import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Toaster } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type PhoneFrameProps = {
  children: ReactNode;
  /** บังคับแสดงกรอบแม้จอแคบ — ใช้กับ /dev/overlay ที่ต้องเทียบ mockup ที่ 393px */
  forceFrame?: boolean;
  /** เนื้อหาข้างกรอบบน desktop (เช่น Demo tools) */
  aside?: ReactNode;
  className?: string;
};

/**
 * มือถือ: แอปเต็มจอ (100dvh, max 430px) + safe area
 * Desktop / forceFrame: กรอบโทรศัพท์ 393×852 r44 กลางจอ + ป้าย Prototype ข้างกรอบ
 *
 * กรอบใช้ transform-gpu เพื่อให้ element `position: fixed` (bottom sheet, toast) อยู่ในกรอบ ไม่ล้นไปทั้งจอ
 */
export function PhoneFrame({ children, forceFrame, aside, className }: PhoneFrameProps) {
  return (
    <div
      data-frame={forceFrame ? "force" : undefined}
      className="min-h-dvh bg-bg md:gap-10 md:p-8 framed:flex framed:items-center framed:justify-center"
    >
      <div
        className={cn(
          "relative mx-auto flex h-dvh w-full max-w-[430px] transform-gpu flex-col overflow-hidden bg-bg",
          "framed:mx-0 framed:w-[393px] framed:max-w-none framed:shrink-0 framed:rounded-frame framed:shadow-phone",
          // desktop ที่จอเตี้ยกว่า 852+ขอบ: ย่อความสูงกรอบให้พอดีหน้าต่าง (เนื้อหาเลื่อนได้) · overlay สูง 852 เป๊ะ
          forceFrame ? "framed:h-[852px]" : "framed:h-[min(852px,calc(100dvh-4rem))]",
          className,
        )}
      >
        {children}
        <Toaster />
      </div>
      {!forceFrame && (
        <aside className="hidden w-56 flex-col gap-4 md:flex">
          <DemoBadge />
          {aside}
        </aside>
      )}
    </div>
  );
}
