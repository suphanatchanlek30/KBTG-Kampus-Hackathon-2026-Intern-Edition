import { beforeEach, describe, expect, it, vi } from "vitest";

const toPng = vi.fn();
vi.mock("html-to-image", () => ({ toPng: (...args: unknown[]) => toPng(...args) }));

import { captureWithWatermark } from "./export-image";

describe("captureWithWatermark", () => {
  beforeEach(() => {
    toPng.mockReset();
    vi.stubGlobal("fetch", async () => ({ blob: async () => new Blob(["png"]) }));
  });

  it("captures the node with the SIMULATED watermark inside, then removes it", async () => {
    const node = document.createElement("section");
    node.textContent = "หลักฐานดีล";
    document.body.append(node);

    let seen = "";
    toPng.mockImplementation(async (el: HTMLElement) => {
      seen = el.textContent ?? "";
      return "data:image/png;base64,AA==";
    });

    await captureWithWatermark(node);
    expect(seen).toContain("SIMULATED · Prototype");
    expect(node.textContent).toBe("หลักฐานดีล");
    expect(node.style.position).toBe("");
  });

  it("removes the watermark even when capture fails", async () => {
    const node = document.createElement("section");
    toPng.mockRejectedValue(new Error("canvas tainted"));
    await expect(captureWithWatermark(node)).rejects.toThrow();
    expect(node.childElementCount).toBe(0);
  });
});
