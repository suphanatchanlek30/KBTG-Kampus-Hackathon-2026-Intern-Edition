import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { HomeIndicator } from "./HomeIndicator";
import { StatusBar } from "./StatusBar";

type AppShellProps = {
  children: ReactNode;
  /** AppHeader / HomeHeader — ไม่เลื่อนตามเนื้อหา */
  header?: ReactNode;
  /** StickyFooter / BottomNav — ติดล่างเสมอ */
  footer?: ReactNode;
  /** ลายพื้นหลัง (glow, วงแหวน) วางแบบ absolute ใต้เนื้อหา */
  background?: ReactNode;
  /** สีพื้นแถบ home indicator — หน้าที่มี BottomNav ใช้ "bg-nav" ให้ต่อกับแถบ nav */
  indicatorClassName?: string;
  className?: string;
};

/**
 * โครงหน้าจอ: [status bar] · header · เนื้อหา (เลื่อนได้) · footer · [home indicator]
 * ตามเฟรม 393×852: 50 · 52|64 · … · 68|64 · 30
 */
export function AppShell({ children, header, footer, background, indicatorClassName, className }: AppShellProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)] framed:pt-0">
      {background && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {background}
        </div>
      )}
      <div className="relative z-10 shrink-0">
        <StatusBar />
        {header}
      </div>
      <main
        className={cn("relative z-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain", className)}
      >
        {children}
      </main>
      {footer && <div className="relative z-10 shrink-0">{footer}</div>}
      <HomeIndicator className={cn("relative z-10", indicatorClassName)} />
    </div>
  );
}
