import { expect, test, type Page } from "@playwright/test";

import { assertLiveApi, getDeal, liveE2E } from "./helpers";

/** One visitor: open /play, accept the invitation and finish the whole deal as the tenant. */
async function playFullDeal(page: Page) {
  await page.goto("/play");
  await expect(page).toHaveURL(/\/invites\//, { timeout: 15_000 });
  await page.getByRole("button", { name: /ยอมรับและกันเงิน/ }).click();
  await expect(page).toHaveURL(/\/deals\/[^/]+\/lock/);
  const dealId = page.url().match(/\/deals\/([^/]+)\/lock/)![1];
  await expect(page.getByText("กันเงินเรียบร้อย")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "ดูสถานะดีล" }).click();
  await page.getByRole("button", { name: "ยืนยันว่าดูห้องแล้ว" }).click();
  await page.getByText("ได้ดูห้องจริงแล้ว").click();
  await page.getByText("ห้องตรงกับเลขห้องและรายละเอียดในดีล").click();
  await page.getByText("ผู้ให้เช่าเป็นคนเดียวกับในดีล").click();
  await page.getByRole("button", { name: /^ปล่อยค่าจอง [\d,]+$/ }).click();
  await expect(page.getByRole("button", { name: "ยืนยันการเข้าอยู่" })).toBeVisible();

  await page.getByRole("button", { name: "ยืนยันการเข้าอยู่" }).click();
  await page.getByText("ได้รับกุญแจ / คีย์การ์ดแล้ว").click();
  await page.getByText("เข้าห้องและใช้งานได้จริง").click();
  await page.getByText("ทำสัญญาเช่าเรียบร้อย").click();
  await page.getByRole("button", { name: /ปล่อยมัดจำหลัก/ }).click();
  await expect.poll(() => getDeal(page, dealId).then((deal) => deal.state)).toBe("RELEASED");
  return dealId;
}

test.describe("private sandboxes", () => {
  test.skip(!liveE2E, "Run with PLAYWRIGHT_LIVE_API=true against make up and a real-API frontend.");

  test("two visitors each finish their own deal at the same time", async ({ browser }) => {
    test.setTimeout(60_000);
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    try {
      const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
      await assertLiveApi(a);
      const [dealA, dealB] = await Promise.all([playFullDeal(a), playFullDeal(b)]);
      expect(dealA).not.toBe(dealB);

      // Each visitor's deal is invisible to the other.
      expect((await a.request.get(`/api/v1/deals/${dealB}`)).status()).toBe(404);
      expect((await b.request.get(`/api/v1/deals/${dealA}`)).status()).toBe(404);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
});
