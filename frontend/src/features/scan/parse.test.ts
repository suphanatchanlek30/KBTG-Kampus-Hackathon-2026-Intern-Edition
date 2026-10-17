import { describe, expect, it } from "vitest";

import { invitationIdFromScan } from "./parse";

describe("invitationIdFromScan", () => {
  it("normalizes K Sure share codes", () => {
    expect(invitationIdFromScan("  ks-ab12cd  ")).toBe("KS-AB12CD");
  });

  it("reads an invitation identifier from a K Sure invitation URL", () => {
    expect(invitationIdFromScan("https://ksure.example/invites/KST_abc%2F123")).toBe("KST_abc/123");
  });

  it("rejects empty, unrelated, and malformed values", () => {
    expect(invitationIdFromScan("")).toBeNull();
    expect(invitationIdFromScan("https://ksure.example/deals/deal-123")).toBeNull();
    expect(invitationIdFromScan("not-a-k-sure-code")).toBeNull();
  });
});
