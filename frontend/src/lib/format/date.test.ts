import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatDayMonthTime,
  formatExpiry,
  formatTime,
  formatTimeNa,
  formatWeekdayDate,
} from "./date";

// ค่าตาม docs/02-ui-spec.md §3.2 และข้อมูลเดโมใน docs/01-user-flow.md §2 (เวลา Asia/Bangkok = UTC+7)
const VIEWING = "2026-10-18T14:00:00+07:00";
const MOVE_IN = "2026-11-01T00:00:00+07:00";
const EXPIRY = "2026-11-03T23:59:00+07:00";
const SENT = "2026-10-14T10:26:00+07:00";

describe("Thai Buddhist-era date formats", () => {
  it("วัน เดือนย่อ ปี · เวลา", () => {
    expect(formatDateTime(VIEWING)).toBe("18 ต.ค. 2569 · 14:00");
    expect(formatDateTime("2026-10-15T10:24:00+07:00")).toBe("15 ต.ค. 2569 · 10:24");
  });

  it("วัน เดือนย่อ · เวลา (ไม่มีปี)", () => {
    expect(formatDayMonthTime(VIEWING)).toBe("18 ต.ค. · 14:00");
  });

  it("วัน เดือนย่อ ปี", () => {
    expect(formatDate(MOVE_IN)).toBe("1 พ.ย. 2569");
  });

  it("วัน เดือนย่อ (สั้น)", () => {
    expect(formatDayMonth(VIEWING)).toBe("18 ต.ค.");
    expect(formatDayMonth(MOVE_IN)).toBe("1 พ.ย.");
  });

  it("วันในสัปดาห์ + วันที่", () => {
    expect(formatWeekdayDate(VIEWING)).toBe("อา. 18 ต.ค. 2569");
  });

  it("เวลา + น.", () => {
    expect(formatTimeNa(VIEWING)).toBe("14:00 น.");
  });

  it("เวลาอย่างเดียว", () => {
    expect(formatTime(SENT)).toBe("10:26");
  });

  it("วันหมดอายุ (ไม่มี ·)", () => {
    expect(formatExpiry(EXPIRY)).toBe("3 พ.ย. 2569 23:59");
  });

  it("uses U+00B7 middle dot with spaces", () => {
    expect(formatDateTime(VIEWING)).toContain(" · ");
  });

  it("converts from UTC to Bangkok across a day boundary", () => {
    // 2026-10-31 17:00 UTC = 2026-11-01 00:00 ที่กรุงเทพฯ
    expect(formatDate("2026-10-31T17:00:00Z")).toBe("1 พ.ย. 2569");
    expect(formatTime("2026-10-31T17:00:00Z")).toBe("00:00");
  });

  it("accepts Date and epoch ms", () => {
    const d = new Date(VIEWING);
    expect(formatDateTime(d)).toBe("18 ต.ค. 2569 · 14:00");
    expect(formatDateTime(d.getTime())).toBe("18 ต.ค. 2569 · 14:00");
  });

  it("throws on invalid input", () => {
    expect(() => formatDate("not a date")).toThrow(RangeError);
  });
});
