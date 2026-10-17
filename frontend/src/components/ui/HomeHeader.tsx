"use client";

import { Bell, Menu } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { useMotionMode } from "@/components/motion/MotionMode";
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

export function HomeHeader({ greeting, name, notificationCount = 0, onBell, onMenu }: HomeHeaderProps) {
  const full = useMotionMode() === "full";
  const [seenCount, setSeenCount] = useState(notificationCount);
  const [rings, setRings] = useState(0);
  if (notificationCount !== seenCount) {
    setSeenCount(notificationCount);
    if (notificationCount > seenCount) setRings((r) => r + 1);
  }
  const ringing = full && rings > 0;

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
        <motion.span
          key={`bell-${rings}`}
          className="flex"
          animate={ringing ? { rotate: [0, -14, 12, -8, 6, 0] } : undefined}
          transition={{ duration: 0.6 }}
        >
          <Bell size={17} strokeWidth={1.35} />
        </motion.span>
        {notificationCount > 0 && (
          <motion.span
            key={`badge-${rings}`}
            className="absolute -top-0.5 left-6 flex"
            initial={ringing ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 14 }}
          >
            <Badge variant="count" aria-hidden>
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          </motion.span>
        )}
      </IconButton>
      <IconButton aria-label="เมนู" onClick={onMenu}>
        <Menu size={17} strokeWidth={1.42} />
      </IconButton>
    </header>
  );
}
