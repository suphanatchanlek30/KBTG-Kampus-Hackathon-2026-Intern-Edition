import { expect, test } from "@playwright/test";

import { activeDealId, assertLiveApi, getDeal, liveE2E, loginAs, resetScenario } from "./helpers";

test.describe("expire deal", () => {
  test.skip(!liveE2E, "Run with PLAYWRIGHT_LIVE_API=true against make up and a real-API frontend.");

  test("expiring a funded deal refunds the tenant and shows the result screen", async ({ browser }) => {
    const landlordContext = await browser.newContext();
    const tenantContext = await browser.newContext();
    const landlord = await landlordContext.newPage();
    const tenant = await tenantContext.newPage();

    try {
      await assertLiveApi(landlord);
      await loginAs(landlord, "landlord");
      await loginAs(tenant, "tenant");
      await resetScenario(landlord, "funds_locked");
      const dealId = await activeDealId(tenant);

      await tenant.goto(`/deals/${dealId}`);
      const expire = await tenant.request.post(`/api/v1/demo/deals/${dealId}/expire-now`);
      expect(expire.ok()).toBeTruthy();
      await tenant.reload();

      await expect(tenant.getByText("ดีลหมดอายุ · คืนเงินอัตโนมัติ")).toBeVisible();
      await expect.poll(() => getDeal(tenant, dealId).then((deal) => deal.state)).toBe("REFUNDED");
    } finally {
      await landlordContext.close();
      await tenantContext.close();
    }
  });
});
