import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps custom font-size and color tokens together", () => {
    expect(cn("text-title", "text-neon")).toBe("text-title text-neon");
    expect(cn("text-amount-hero", "text-ink")).toBe("text-amount-hero text-ink");
  });

  it("still dedupes within the same group", () => {
    expect(cn("text-gray", "text-neon")).toBe("text-neon");
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("bg-card", "bg-card2")).toBe("bg-card2");
    expect(cn("rounded-card", "rounded-card-xl")).toBe("rounded-card-xl");
    expect(cn("shadow-cta", "shadow-none")).toBe("shadow-none");
  });
});
