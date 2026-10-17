
const formatters = {
  0: new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
} as const;

export function formatBaht(satang: number, decimals: 0 | 2 = 0): string {
  if (!Number.isSafeInteger(satang)) {
    throw new TypeError(`formatBaht expects integer satang, got ${satang}`);
  }
  return formatters[decimals].format(satang / 100);
}

export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}
