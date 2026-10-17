import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "dark" | "link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "h-[54px] w-full rounded-full bg-neon text-button text-ink shadow-cta disabled:shadow-none",
  secondary: "h-12 w-full rounded-full border border-stroke text-section text-white",
  dark: "h-[54px] w-full rounded-full bg-ink text-button text-white",
  link: "h-auto text-body-strong text-white underline underline-offset-4",
};

export function Button({
  variant = "primary",
  iconLeft,
  iconRight,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 transition-[transform,opacity,box-shadow] duration-[120ms,300ms,300ms] select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon",
        "enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        loading && "disabled:opacity-100",
        className,
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {iconLeft}
        {children}
        {iconRight}
      </span>
      {loading && (
        <LoaderCircle aria-label="กำลังโหลด" className="absolute size-[18px] animate-spin" strokeWidth={2.2} />
      )}
    </button>
  );
}
