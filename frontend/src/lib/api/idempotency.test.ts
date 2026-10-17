import { describe, expect, it } from "vitest";
import { idempotencyKey, releaseIdempotencyKey } from "./idempotency";

describe("idempotencyKey", () => {
  it("returns the same key for retries of one action", () => {
    const a = idempotencyKey("lock:deal-1:v1");
    expect(idempotencyKey("lock:deal-1:v1")).toBe(a);
  });

  it("gives other actions their own key", () => {
    expect(idempotencyKey("lock:deal-2:v1")).not.toBe(idempotencyKey("lock:deal-1:v1"));
  });

  it("gives a new key once the action is finished", () => {
    const a = idempotencyKey("confirm-viewing:deal-1:v2");
    releaseIdempotencyKey("confirm-viewing:deal-1:v2");
    expect(idempotencyKey("confirm-viewing:deal-1:v2")).not.toBe(a);
  });
});
