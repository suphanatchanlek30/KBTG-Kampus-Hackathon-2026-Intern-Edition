const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const BUDDHIST_ERA_OFFSET = 543;
const SEP = " · "; // U+00B7 with surrounding spaces.

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

export function formatDateTime(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year}${SEP}${p.time}`;
}

export function formatDayMonthTime(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month}${SEP}${p.time}`;
}

export function formatDate(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year}`;
}

export function formatDayMonth(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month}`;
}

export function formatWeekdayDate(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

export function formatTimeNa(input: DateInput): string {
  return `${bangkokParts(input).time} น.`;
}

/** Formats a Bangkok time without a date. */
export function formatTime(input: DateInput): string {
  return bangkokParts(input).time;
}

export function formatExpiry(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.year} ${p.time}`;
}

export function formatDayMonthTimeCompact(input: DateInput): string {
  const p = bangkokParts(input);
  return `${p.day} ${p.month} ${p.time}`;
}

export function toBangkokInputValue(input: DateInput): string {
  const d = new Date(new Date(input).getTime() + BANGKOK_OFFSET_MS);
  return d.toISOString().slice(0, 16);
}

export function fromBangkokInputValue(value: string): string {
  return `${value.slice(0, 16)}:00+07:00`;
}
