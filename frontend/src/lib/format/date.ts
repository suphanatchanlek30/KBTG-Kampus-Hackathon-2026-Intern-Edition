// วันที่แบบไทย ปี พ.ศ. เวลา Asia/Bangkok (docs/02-ui-spec.md §3.2)
//
// ไม่ใช้ Intl.DateTimeFormat เพราะ ICU ของ Node กับเบราว์เซอร์ให้ผลต่างกันได้ (hydration mismatch)
// และให้ชื่อวันเต็ม ("อาทิตย์") แทนชื่อย่อ ("อา.") ที่ดีไซน์ใช้ — ประเทศไทยไม่มี DST จึงใช้ UTC+7 ตรงๆ ได้

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const BUDDHIST_ERA_OFFSET = 543;
const SEP = " · "; // U+00B7 มีช่องว่างทั้งสองข้าง

const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

type DateInput = Date | string | number;

function bangkokParts(input: DateInput) {
  const d = new Date(new Date(input).getTime() + BANGKOK_OFFSET_MS);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(input)}`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    day: d.getUTCDate(),
    month: MONTHS_SHORT[d.getUTCMonth()],
    year: d.getUTCFullYear() + BUDDHIST_ERA_OFFSET,
    weekday: WEEKDAYS_SHORT[d.getUTCDay()],
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

/** `18 ต.ค. 2569 · 14:00` — L3, L5 ไทม์ไลน์, L6/T7, L4 "ใช้ได้ถึง" */
export function formatDateTime(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year}${SEP}${p.time}`;
}

/** `18 ต.ค. · 14:00` — L2 ช่องนัดดูห้อง */
export function formatDayMonthTime(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month}${SEP}${p.time}`;
}

/** `1 พ.ย. 2569` — L2 วันเข้าอยู่, T5 */
export function formatDate(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year}`;
}

/** `18 ต.ค.` — T2 คำอธิบายแถว */
export function formatDayMonth(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month}`;
}

/** `อา. 18 ต.ค. 2569` — T4 */
export function formatWeekdayDate(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** `14:00 น.` — T4 บรรทัดรอง */
export function formatTimeNa(input: DateInput): string {
  return `${bangkokParts(input).time} น.`;
}

/** `10:26` — T1 */
export function formatTime(input: DateInput): string {
  return bangkokParts(input).time;
}

/** `3 พ.ย. 2569 23:59` — วันหมดอายุ L3, T2 (ไม่มี ·) */
export function formatExpiry(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year} ${p.time}`;
}

/** `18 ต.ค. 14:00` — T1 การ์ดคำขอ "ดูห้อง …" (ไม่มี · และไม่มีปี) */
export function formatDayMonthTimeCompact(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.time}`;
}
