import { expect, test } from "@playwright/test";

import { assertLiveApi, getDeal, liveE2E, loginAs, pendingInvite, resetScenario } from "./helpers";

test.describe("full rental-deposit deal", () => {
  test.skip(!liveE2E, "Run with PLAYWRIGHT_LIVE_API=true against make up and a real-API frontend.");

  test("tenant locks funds, releases the booking fee, then releases the main deposit", async ({ browser }) => {
    test.setTimeout(45_000);
    const landlordContext = await browser.newContext();
    const tenantContext = await browser.newContext();
    const landlord = await landlordContext.newPage();
    const tenant = await tenantContext.newPage();

    try {
      await assertLiveApi(landlord);
      await loginAs(landlord, "landlord");
      await loginAs(tenant, "tenant");
      await resetScenario(landlord, "waiting_accept");

      const invite = await pendingInvite(tenant);
      await tenant.goto(`/invites/${invite.shareCode}`);
      await tenant.getByRole("button", { name: /ยอมรับและกันเงิน/ }).click();
      await expect(tenant).toHaveURL(new RegExp(`/deals/${invite.dealId}/lock`));
      await expect(tenant.getByText("กันเงินเรียบร้อย")).toBeVisible({ timeout: 10_000 });

      await tenant.getByRole("button", { name: "ดูสถานะดีล" }).click();
      await tenant.getByRole("button", { name: "ยืนยันว่าดูห้องแล้ว" }).click();
      await tenant.getByText("ได้ดูห้องจริงแล้ว").click();
      await tenant.getByText("ห้องตรงกับเลขห้องและรายละเอียดในดีล").click();
      await tenant.getByText("ผู้ให้เช่าเป็นคนเดียวกับในดีล").click();
      await tenant.getByRole("button", { name: /^ปล่อยค่าจอง [\d,]+$/ }).click();
      await expect(tenant.getByRole("button", { name: "ยืนยันการเข้าอยู่" })).toBeVisible();

      await tenant.getByRole("button", { name: "ยืนยันการเข้าอยู่" }).click();
      await tenant.getByText("ได้รับกุญแจ / คีย์การ์ดแล้ว").click();
      await tenant.getByText("เข้าห้องและใช้งานได้จริง").click();
      await tenant.getByText("ทำสัญญาเช่าเรียบร้อย").click();
      await tenant.getByRole("button", { name: /ปล่อยมัดจำหลัก/ }).click();

      await expect.poll(() => getDeal(tenant, invite.dealId).then((deal) => deal.state)).toBe("RELEASED");
      await landlord.goto(`/deals/${invite.dealId}`);
      await expect(landlord.getByRole("button", { name: "ดูหลักฐานดีล" })).toBeVisible();
    } finally {
      await landlordContext.close();
      await tenantContext.close();
    }
  });
});
