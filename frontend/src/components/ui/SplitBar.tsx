/** แถบแบ่งสัดส่วน ค่าจอง (neon) / มัดจำหลัก (ขาว) — L2 (Figma: สูง 8 r4 · gap 4) */
export function SplitBar({ first, total }: { first: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (first / total) * 100)) : 0;
  return (
    <div role="img" aria-label={`ค่าจอง ${Math.round(pct)}% ของยอดรวม`} className="flex h-2 gap-1">
      <span
        className="h-full basis-0 rounded-[4px] bg-neon transition-[flex-grow] duration-300"
        style={{ flexGrow: pct }}
      />
      <span
        className="h-full basis-0 rounded-[4px] bg-white transition-[flex-grow] duration-300"
        style={{ flexGrow: 100 - pct }}
      />
    </div>
  );
}
