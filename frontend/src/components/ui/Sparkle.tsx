import type { CSSProperties } from "react";

export function Sparkle({
  size,
  color = "currentColor",
  className,
  style,
}: {
  size: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" className={className} style={style}>
      <path
        d="M8 0C8.6 5.2 10.8 7.4 16 8C10.8 8.6 8.6 10.8 8 16C7.4 10.8 5.2 8.6 0 8C5.2 7.4 7.4 5.2 8 0Z"
        fill={color}
      />
    </svg>
  );
}
