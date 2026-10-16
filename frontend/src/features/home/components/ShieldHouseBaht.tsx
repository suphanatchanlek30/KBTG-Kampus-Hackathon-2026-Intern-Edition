/**
 * ภาพประกอบแบนเนอร์ L1: วงกลมขาว + โล่ดำ + บ้านเขียว + เหรียญ ฿
 * วาดจากพิกัด vector ใน Figma (กรอบ 92×104) — ยังไม่มีไฟล์ SVG ต้นฉบับ (docs/07-assets.md §4)
 */
export function ShieldHouseBaht({ className }: { className?: string }) {
  return (
    <svg aria-hidden width="92" height="104" viewBox="0 0 92 104" fill="none" className={className}>
      <circle cx="46" cy="56" r="40" fill="#FFFFFF" />
      <path d="M46 32 L70 40 V60 C70 76 59 86 46 90 C33 86 22 76 22 60 V40 Z" fill="#00040E" />
      <path
        d="M37.5 61.5 L46 53.5 L54.5 61.5 V71.5 H37.5 Z"
        stroke="#5DF591"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M43 71.5 V66 H49 V71.5" stroke="#5DF591" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="74" cy="24" r="12" fill="#5DF591" />
      <text
        x="74"
        y="28.6"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#111111"
        fontFamily="var(--font-poppins), sans-serif"
      >
        ฿
      </text>
    </svg>
  );
}
