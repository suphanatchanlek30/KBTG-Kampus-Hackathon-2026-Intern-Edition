import { describe, expect, it } from "vitest";
import { defaultDraftDates } from "./draft";

const at = (iso: string) => new Date(iso);

describe("defaultDraftDates", () => {
  it("matches the mockup on Wed 14 Oct 2026", () => {
    expect(defaultDraftDates(at("2026-10-14T10:24:00+07:00"))).toEqual({
      viewingAt: "2026-10-18T14:00:00+07:00",
      moveInDate: "2026-11-01",
    });
  });

  it("uses next week's Sunday on a Sunday", () => {
    expect(defaultDraftDates(at("2026-10-18T09:00:00+07:00")).viewingAt).toBe("2026-10-25T14:00:00+07:00");
  });

  it("uses Thai time near midnight UTC", () => {
    expect(defaultDraftDates(at("2026-10-17T17:30:00Z")).viewingAt).toBe("2026-10-25T14:00:00+07:00");
  });

  it("moves in a month later when the viewing is after the 1st", () => {
    expect(defaultDraftDates(at("2026-11-30T12:00:00+07:00"))).toEqual({
      viewingAt: "2026-12-06T14:00:00+07:00",
      moveInDate: "2027-01-01",
    });
  });
});
