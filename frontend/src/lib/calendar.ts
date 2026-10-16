// สร้างไฟล์ปฏิทิน .ics ฝั่ง client (Phase 8 จะใช้ GET /deals/{id}/calendar.ics จาก server แทน)

type CalendarEvent = {
  uid: string;
  title: string;
  /** ISO-8601 */
  start: string;
  durationMinutes?: number;
  /** ทั้งวัน (วันเข้าอยู่) — start เป็น `YYYY-MM-DD` */
  allDay?: boolean;
  description?: string;
};

const toUtcStamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escapeText = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export function buildIcs(event: CalendarEvent): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//K Sure//Prototype//TH", "BEGIN:VEVENT"];
  lines.push(`UID:${event.uid}`, `DTSTAMP:${toUtcStamp(new Date().toISOString())}`);
  if (event.allDay) {
    const day = event.start.slice(0, 10).replace(/-/g, "");
    lines.push(`DTSTART;VALUE=DATE:${day}`);
  } else {
    const end = new Date(new Date(event.start).getTime() + (event.durationMinutes ?? 60) * 60_000).toISOString();
    lines.push(`DTSTART:${toUtcStamp(event.start)}`, `DTEND:${toUtcStamp(end)}`);
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, event: CalendarEvent) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
