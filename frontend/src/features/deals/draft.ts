
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function defaultDraftDates(now: Date): { viewingAt: string; moveInDate: string } {
  const bkk = new Date(now.getTime() + BKK_OFFSET_MS);
  const daysToSunday = (7 - bkk.getUTCDay()) % 7 || 7;
  const viewing = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate() + daysToSunday));

  let moveIn = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, 1));
  if (moveIn < viewing) moveIn = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 2, 1));

  return { viewingAt: `${ymd(viewing)}T14:00:00+07:00`, moveInDate: ymd(moveIn) };
}
