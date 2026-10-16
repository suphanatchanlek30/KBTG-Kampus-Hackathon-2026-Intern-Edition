import { Bell, House, ReceiptText, ScanLine, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";

export type NavTab = "home" | "transactions" | "notifications" | "account";

const TABS: { id: NavTab; label: string; icon: LucideIcon; href: string }[] = [
  { id: "home", label: "หน้าหลัก", icon: House, href: "/home" },
  { id: "transactions", label: "ธุรกรรม", icon: ReceiptText, href: "/home" },
  { id: "notifications", label: "แจ้งเตือน", icon: Bell, href: "/notifications" },
  { id: "account", label: "บัญชี", icon: User, href: "/home" },
];

type BottomNavProps = {
  active?: NavTab;
  notificationCount?: number;
  scanHref?: string;
};

/**
 * Bottom nav L1/T1 (Figma: 393×64 · #111214 · ขอบบน #1E2024 · pad 0/8)
 * 4 แท็บ 58×40 (ไอคอน 21 · gap 3) + ปุ่มสแกนกลาง 52×52 r18
 */
export function BottomNav({ active = "home", notificationCount = 0, scanHref = "/scan" }: BottomNavProps) {
  const renderTab = ({ id, label, icon: Icon, href }: (typeof TABS)[number]) => {
    const isActive = id === active;
    return (
      <Link
        key={id}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex h-10 w-[58px] flex-col items-center gap-[3px] text-nav-label",
          isActive ? "font-semibold text-neon" : "text-muted",
        )}
      >
        <Icon size={21} strokeWidth={1.57} />
        <span>{label}</span>
        {id === "notifications" && notificationCount > 0 && (
          <Badge variant="count" className="absolute -top-1 left-[30px] border-nav">
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </Link>
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
        <Link
          href={scanHref}
          aria-label="สแกน QR"
          className="flex size-[52px] items-center justify-center rounded-[18px] bg-neon text-ink shadow-scan transition-transform active:scale-[0.94]"
        >
          <ScanLine size={22} strokeWidth={2.11} />
        </Link>
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
