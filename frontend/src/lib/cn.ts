import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// ต้องบอก tailwind-merge ให้รู้จัก token ใน globals.css
// ไม่งั้น cn("text-title", "text-neon") จะคิดว่าเป็นกลุ่มเดียวกันแล้วตัดทิ้งไปหนึ่งตัว
const FONT_SIZES = [
  "amount-hero",
  "amount-balance",
  "amount-lg",
  "amount-input",
  "amount-md",
  "title",
  "title-sm",
  "greeting-name",
  "sheet-title",
  "promo-title",
  "header",
  "button",
  "amount-row",
  "code",
  "section",
  "body-strong",
  "input",
  "row-title",
  "check-item",
  "card-title",
  "body",
  "meta",
  "caption",
  "service-label",
  "badge",
  "micro",
  "eyebrow",
  "nav-label",
  "count",
];

const COLORS = [
  "bg",
  "card",
  "card2",
  "line",
  "white",
  "gray",
  "muted",
  "neon",
  "mint",
  "parsley",
  "warn",
  "danger",
  "nav",
  "nav-line",
  "stroke",
  "ink",
  "ink-2",
  "ink-mint",
  "divider-light",
  "sheet-list",
  "warn-soft",
  "warn-edge",
  "warn-text",
  "mint-mid",
  "sage",
  "mint-text",
  "dim",
  "ink-green",
  "mint-pale",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: FONT_SIZES,
      color: COLORS,
      radius: ["card", "card-xl", "icon-btn", "tile", "frame"],
      shadow: [
        "cta",
        "hero",
        "hero-sm",
        "mint",
        "phone",
        "scan",
        "ring-neon",
        "dot-neon",
        "tile-active",
        "accent-neon",
        "accent-white",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
