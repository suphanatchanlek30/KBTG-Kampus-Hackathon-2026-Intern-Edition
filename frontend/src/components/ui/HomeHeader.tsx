import { Bell, Menu } from "lucide-react";
import Image from "next/image";
import { brand } from "@/config/brand";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";

type HomeHeaderProps = {
  greeting: string;
  name: string;
  notificationCount?: number;
  onBell?: () => void;
  onMenu?: () => void;
};

/** Header หน้าหลัก L1/T1 (Figma: สูง 64 · pad 0/20 · gap 12 · โลโก้ 42×42 r14) */
export function HomeHeader({ greeting, name, notificationCount = 0, onBell, onMenu }: HomeHeaderProps) {
  return (
    <header className="flex h-16 items-center gap-3 px-5">
      <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile border border-line bg-card">
        <Image src={brand.mark.src} alt={brand.name} width={20} height={19} loading="eager" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted">{greeting}</span>
        <span className="truncate text-greeting-name">{name}</span>
      </div>
      <IconButton
        aria-label={notificationCount > 0 ? `แจ้งเตือน ${notificationCount} รายการ` : "แจ้งเตือน"}
        onClick={onBell}
      >
        <Bell size={17} strokeWidth={1.35} />
        {notificationCount > 0 && (
          <Badge variant="count" className="absolute -top-0.5 left-6" aria-hidden>
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </IconButton>
      <IconButton aria-label="เมนู" onClick={onMenu}>
        <Menu size={17} strokeWidth={1.42} />
      </IconButton>
    </header>
  );
}
