import { describe, expect, it } from "vitest";
import { makeDeal } from "@/mocks/fixtures";
import { dealExpiry } from "./rules";
import { isClosedUnsuccessfully, isFundsSecured, stateBadge, timelineSteps, trancheStatusLabel } from "./state";

describe("timelineSteps", () => {
  const statuses = (state: Parameters<typeof makeDeal>[0]) =>
    timelineSteps(makeDeal(state, "LANDLORD")).map((s) => s.status);

  it("marks exactly one current step on the happy path", () => {
    expect(statuses("WAITING_ACCEPT")).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(statuses("FUNDS_LOCKED")).toEqual(["done", "done", "current", "upcoming"]);
    expect(statuses("BOOKING_FEE_RELEASED")).toEqual(["done", "done", "done", "current"]);
    expect(statuses("RELEASED")).toEqual(["done", "done", "done", "done"]);
  });

  it("uses mockup copy for L5", () => {
    const steps = timelineSteps(makeDeal("FUNDS_LOCKED", "LANDLORD"));
    expect(steps[1]).toMatchObject({ title: "ผู้เช่ายอมรับ และกันเงิน 6,500", detail: "14 ต.ค. 2569 · 10:31" });
    expect(steps[2].detail).toBe("18 ต.ค. 2569 · 14:00 — ยืนยันแล้วปล่อยค่าจอง 1,000");
    expect(steps[3].detail).toBe("1 พ.ย. 2569 — ยืนยันแล้วปล่อยมัดจำหลัก 5,500");
  });

  it("speaks to the tenant on D8", () => {
    expect(timelineSteps(makeDeal("FUNDS_LOCKED", "TENANT"))[1].title).toBe("คุณยอมรับ และกันเงิน 6,500");
  });
});

describe("trancheStatusLabel", () => {
  it("follows the deal state and role", () => {
    expect(trancheStatusLabel(makeDeal("FUNDS_LOCKED", "LANDLORD"), "BOOKING_FEE")).toBe("รอผู้เช่าดูห้อง");
    expect(trancheStatusLabel(makeDeal("FUNDS_LOCKED", "LANDLORD"), "MAIN_DEPOSIT")).toBe("รอผู้เช่าเข้าอยู่");
    expect(trancheStatusLabel(makeDeal("BOOKING_FEE_RELEASED", "LANDLORD"), "BOOKING_FEE")).toBe("ได้รับแล้ว ✓");
    expect(trancheStatusLabel(makeDeal("BOOKING_FEE_RELEASED", "TENANT"), "BOOKING_FEE")).toBe("ปล่อยแล้ว ✓");
    expect(trancheStatusLabel(makeDeal("WAITING_ACCEPT", "LANDLORD"), "BOOKING_FEE")).toBe("ยังไม่กันเงิน");
  });
});

describe("state helpers", () => {
  it("classifies states", () => {
    expect(stateBadge("FUNDS_LOCKED")).toEqual({ label: "กำลังดำเนินการ", variant: "warn-soft" });
    expect(isFundsSecured("WAITING_ACCEPT")).toBe(false);
    expect(isFundsSecured("RELEASED")).toBe(true);
    expect(isClosedUnsuccessfully("REFUNDED")).toBe(true);
  });
});

describe("dealExpiry", () => {
  it("is move-in date + 2 days at 23:59 Bangkok time", () => {
    expect(dealExpiry("2026-11-01")).toBe("2026-11-03T23:59:00+07:00");
  });

  it("crosses month and year boundaries", () => {
    expect(dealExpiry("2026-10-30")).toBe("2026-11-01T23:59:00+07:00");
    expect(dealExpiry("2026-12-31")).toBe("2027-01-02T23:59:00+07:00");
  });
});

describe("makeDeal ledger math", () => {
  it("matches the demo balances in docs/04-database.md", () => {
    const deal = makeDeal("BOOKING_FEE_RELEASED", "TENANT");
    expect(deal.amounts.releasedSatang).toBe(100_000);
    expect(deal.amounts.heldSatang).toBe(550_000);
  });
});
