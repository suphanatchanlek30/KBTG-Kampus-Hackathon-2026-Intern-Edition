import { expect, test } from "@playwright/test";

import { assertLiveApi, getDeal, liveE2E, loginAs, pendingInvite, resetScenario } from "./helpers";

test.describe("reject deal", () => {
  test.skip(!liveE2E, "Run with PLAYWRIGHT_LIVE_API=true against make up and a real-API frontend.");

  test("tenant rejects an invitation and the deal closes without locked funds", async ({ browser }) => {
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
      await tenant.getByRole("button", { name: "ปฏิเสธดีล" }).click();
      await tenant.getByRole("button", { name: "ปฏิเสธดีล" }).last().click();

      await expect(tenant.getByText("คุณปฏิเสธดีลนี้แล้ว")).toBeVisible();
      await expect.poll(() => getDeal(landlord, invite.dealId).then((deal) => deal.state)).toBe("REJECTED");
    } finally {
      await landlordContext.close();
      await tenantContext.close();
    }
  });
});
