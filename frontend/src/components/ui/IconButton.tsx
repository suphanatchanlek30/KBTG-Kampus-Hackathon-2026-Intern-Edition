import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** ต้องมีเสมอ เพราะปุ่มไม่มีข้อความ */
  "aria-label": string;
};

/** ปุ่มวงกลมบน header (Figma: 38×38 r19 #16181C) */
export function IconButton({ className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex size-[38px] shrink-0 items-center justify-center rounded-icon-btn bg-card text-white",
        "transition-transform duration-[120ms] active:scale-[0.94]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon",
        className,
      )}
      {...props}
    />
  );
}
