import { expect, test } from "@playwright/test";

import { assertLiveApi, liveE2E, loginAs, resetScenario } from "./helpers";

test.describe("off-deal transfer warning", () => {
  test.skip(!liveE2E, "Run with PLAYWRIGHT_LIVE_API=true against make up and a real-API frontend.");

  test("warns before a tenant sends money outside an active deal", async ({ browser }) => {
    const landlordContext = await browser.newContext();
    const tenantContext = await browser.newContext();
    const landlord = await landlordContext.newPage();
    const tenant = await tenantContext.newPage();

    try {
      await assertLiveApi(landlord);
      await loginAs(landlord, "landlord");
      await loginAs(tenant, "tenant");
      await resetScenario(landlord, "funds_locked");

      await tenant.goto("/transfer");
      await tenant.getByRole("button", { name: "ยืนยันการโอน" }).click();
      await expect(tenant.getByRole("heading", { name: "หยุดก่อน! นี่อาจเป็นการขอเงินนอกดีล" })).toBeVisible();
      await tenant.getByRole("button", { name: "ยกเลิกการโอน" }).click();
      await expect(tenant).toHaveURL(/\/home$/);
    } finally {
      await landlordContext.close();
      await tenantContext.close();
    }
  });
});
