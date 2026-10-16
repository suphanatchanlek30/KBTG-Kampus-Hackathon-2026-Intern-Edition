// วันที่เริ่มต้นของฟอร์ม L2 (docs/04-database.md §5 "ค่าเริ่มต้นฟอร์ม L2")
// นัดดูห้อง = วันอาทิตย์ถัดไป 14:00 · วันเข้าอยู่ = วันที่ 1 ของเดือนถัดไป (เลื่อนอีกเดือนถ้าก่อนวันดูห้อง)
// คิดตามเวลาไทยเสมอ (UTC+7 ไม่มี DST) — server กับ browser ได้ค่าเดียวกัน ไม่เกิด hydration mismatch

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function defaultDraftDates(now: Date): { viewingAt: string; moveInDate: string } {
  // เลื่อนเป็น "นาฬิกาไทย" แล้วอ่านด้วย getUTC*
  const bkk = new Date(now.getTime() + BKK_OFFSET_MS);
  const daysToSunday = (7 - bkk.getUTCDay()) % 7 || 7;
  const viewing = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate() + daysToSunday));

  let moveIn = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, 1));
  if (moveIn < viewing) moveIn = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 2, 1));

  return { viewingAt: `${ymd(viewing)}T14:00:00+07:00`, moveInDate: ymd(moveIn) };
}
