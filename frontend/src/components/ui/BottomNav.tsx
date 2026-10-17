import { Bell, House, ReceiptText, ScanLine, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";

export type NavTab = "home" | "transactions" | "notifications" | "account";

// ไม่มี href = หน้าที่ยังไม่ได้ทำ — กดแล้วไม่ไปไหน
const TABS: { id: NavTab; label: string; icon: LucideIcon; href?: string }[] = [
  { id: "home", label: "หน้าหลัก", icon: House, href: "/home" },
  { id: "transactions", label: "ธุรกรรม", icon: ReceiptText },
  { id: "notifications", label: "แจ้งเตือน", icon: Bell, href: "/notifications" },
  { id: "account", label: "บัญชี", icon: User },
];

const SCAN_BUTTON =
  "flex size-[52px] items-center justify-center rounded-[18px] bg-neon text-ink shadow-scan transition-transform active:scale-[0.94]";

type BottomNavProps = {
  active?: NavTab;
  notificationCount?: number;
  /** ส่งเมื่อบริบทนั้นอนุญาตให้สแกนคำขอได้ */
  scanHref?: string;
};

/**
 * Bottom nav L1/T1 (Figma: 393×64 · #111214 · ขอบบน #1E2024 · pad 0/8)
 * 4 แท็บ 58×40 (ไอคอน 21 · gap 3) + ปุ่มสแกนกลาง 52×52 r18
 */
export function BottomNav({ active = "home", notificationCount = 0, scanHref }: BottomNavProps) {
  const renderTab = ({ id, label, icon: Icon, href }: (typeof TABS)[number]) => {
    const isActive = id === active;
    const className = cn(
      "relative flex h-10 w-[58px] flex-col items-center gap-[3px] text-nav-label",
      isActive ? "font-semibold text-neon" : "text-muted",
    );
    const content = (
      <>
        <Icon size={21} strokeWidth={1.57} />
        <span>{label}</span>
        {id === "notifications" && notificationCount > 0 && (
          <Badge variant="count" className="absolute -top-1 left-[30px] border-nav">
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </>
    );
    return href ? (
      <Link key={id} href={href} aria-current={isActive ? "page" : undefined} className={className}>
        {content}
      </Link>
    ) : (
      <button key={id} type="button" className={className}>
        {content}
      </button>
    );
  };

  return (
    <nav
      aria-label="เมนูหลัก"
      className="flex items-center justify-around border-t border-nav-line bg-nav px-2 pb-[env(safe-area-inset-bottom)] framed:pb-0"
    >
      {/* 63 + ขอบบน 1 = 64 ตาม Figma */}
      <div className="flex h-[63px] w-full items-center justify-around">
        {TABS.slice(0, 2).map(renderTab)}
        {scanHref ? (
          <Link href={scanHref} aria-label="สแกน QR" className={SCAN_BUTTON}>
            <ScanLine size={22} strokeWidth={2.11} />
          </Link>
        ) : (
          <button type="button" aria-label="สแกน QR" className={SCAN_BUTTON}>
            <ScanLine size={22} strokeWidth={2.11} />
          </button>
        )}
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
