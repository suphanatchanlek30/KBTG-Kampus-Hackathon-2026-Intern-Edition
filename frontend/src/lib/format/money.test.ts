import { describe, expect, it } from "vitest";
import { bahtToSatang, formatBaht } from "./money";

describe("formatBaht", () => {
  it.each([
    [650_000, 0, "6,500"],
    [100_000, 0, "1,000"],
    [550_000, 0, "5,500"],
    [0, 0, "0"],
    [650_000, 2, "6,500.00"],
    [4_285_000, 2, "42,850.00"],
    [2_850_000, 2, "28,500.00"],
    [2_200_000, 2, "22,000.00"],
    [4_935_000, 2, "49,350.00"],
    [300_000, 2, "3,000.00"],
    [0, 2, "0.00"],
    [12_345, 2, "123.45"],
  ] as const)("%i satang, %i decimals → %s", (satang, decimals, expected) => {
    expect(formatBaht(satang, decimals)).toBe(expected);
  });

  it("defaults to no decimals", () => {
    expect(formatBaht(650_000)).toBe("6,500");
  });

  it("rejects non-integer satang", () => {
    expect(() => formatBaht(6500.5)).toThrow(TypeError);
  });
});

describe("bahtToSatang", () => {
  it("avoids floating point drift", () => {
    expect(bahtToSatang(0.29)).toBe(29);
    expect(bahtToSatang(6500)).toBe(650_000);
  });
});
