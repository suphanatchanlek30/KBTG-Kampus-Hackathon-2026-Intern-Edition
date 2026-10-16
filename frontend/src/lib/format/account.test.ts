import { describe, expect, it } from "vitest";
import { formatShareCode, maskAccount, shortName } from "./account";

describe("maskAccount", () => {
  it("masks all but last 4", () => {
    expect(maskAccount("4821")).toBe("xxx-x-x4821");
    expect(maskAccount("1432")).toBe("xxx-x-x1432");
  });

  it("rejects anything but 4 digits", () => {
    expect(() => maskAccount("123")).toThrow(RangeError);
    expect(() => maskAccount("1234567890")).toThrow(RangeError);
  });
});

describe("shortName", () => {
  it("matches mockup", () => {
    expect(shortName("สมชาย ใจดี")).toBe("สมชาย ใ.");
    expect(shortName("ณัฐธิดา ศรีสุข")).toBe("ณัฐธิดา ศ.");
  });

  it("handles single name and extra spaces", () => {
    expect(shortName("สมชาย")).toBe("สมชาย");
    expect(shortName("  สมชาย   ใจดี ")).toBe("สมชาย ใ.");
  });
});

describe("formatShareCode", () => {
  it("normalizes", () => {
    expect(formatShareCode(" ks-8f4q21 ")).toBe("KS-8F4Q21");
  });
});
