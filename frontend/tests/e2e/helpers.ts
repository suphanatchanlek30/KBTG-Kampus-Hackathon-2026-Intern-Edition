import type { Page } from "@playwright/test";

type Role = "landlord" | "tenant";
type Scenario = "fresh" | "waiting_accept" | "funds_locked" | "booking_released" | "released";

type HomeResponse = {
  pendingInvites: { dealId: string; shareCode: string }[];
  activeDeals: { dealId: string }[];
};

type DealResponse = { id: string; state: string };

async function requireOk(response: Awaited<ReturnType<Page["request"]["get"]>>, action: string) {
  if (response.ok()) return;
  throw new Error(`${action} failed (${response.status()}): ${await response.text()}`);
}

export async function assertLiveApi(page: Page) {
  const response = await page.request.get("/api/v1/readyz");
  await requireOk(response, "API readiness check");
}

export async function loginAs(page: Page, role: Role) {
  const response = await page.request.post("/api/v1/auth/demo-login", { data: { username: role } });
  await requireOk(response, `login as ${role}`);
  await page.goto("/home");
}

export async function resetScenario(page: Page, scenario: Scenario) {
  const response = await page.request.post(`/api/v1/demo/reset?scenario=${scenario}`);
  await requireOk(response, `reset ${scenario}`);
}

export async function pendingInvite(page: Page) {
  const response = await page.request.get("/api/v1/home");
  await requireOk(response, "read tenant home");
  const home = (await response.json()) as HomeResponse;
  const invite = home.pendingInvites[0];
  if (!invite) throw new Error("Expected a pending invitation for the tenant");
  return invite;
}

export async function activeDealId(page: Page) {
  const response = await page.request.get("/api/v1/home");
  await requireOk(response, "read home");
  const home = (await response.json()) as HomeResponse;
  const dealId = home.activeDeals[0]?.dealId ?? home.pendingInvites[0]?.dealId;
  if (!dealId) throw new Error("Expected an active deal");
  return dealId;
}

export async function getDeal(page: Page, id: string) {
  const response = await page.request.get(`/api/v1/deals/${id}`);
  await requireOk(response, `read deal ${id}`);
  return (await response.json()) as DealResponse;
}

export const liveE2E = process.env.PLAYWRIGHT_LIVE_API === "true";
