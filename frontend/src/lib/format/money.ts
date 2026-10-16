// เงินเป็นสตางค์ (integer) ทุกชั้น — format ตอนแสดงผลเท่านั้น (docs/02-ui-spec.md §3.1)
// ไม่แสดงสัญลักษณ์ ฿

const formatters = {
  0: new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
} as const;

/** `650000` → `"6,500"` (decimals 0) หรือ `"6,500.00"` (decimals 2) */
export function formatBaht(satang: number, decimals: 0 | 2 = 0): string {
  if (!Number.isSafeInteger(satang)) {
    throw new TypeError(`formatBaht expects integer satang, got ${satang}`);
  }
  return formatters[decimals].format(satang / 100);
}

/** แปลงบาท (ตัวเลขที่ผู้ใช้กรอก) → สตางค์ โดยไม่โดน floating point เช่น 0.29 * 100 */
export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}
