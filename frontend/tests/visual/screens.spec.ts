import { expect, test } from "@playwright/test";

const screens = ["L1", "L2", "L3", "L4", "L5", "L6", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

test.describe("393×852 visual regression against Figma overlays", () => {
  for (const screen of screens) {
    test(`${screen} stays aligned with its reference screen`, async ({ page }) => {
      await page.goto(`/dev/overlay?screen=${screen}&opacity=0.5&controls=0`);
      // รอ hydration ของ input/control ที่ใช้ในหน้าจอ static ให้เสร็จก่อนจับภาพ
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${screen}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.001,
      });
    });
  }
});
