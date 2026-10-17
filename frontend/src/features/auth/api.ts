import { env } from "@/config/env";
import { api } from "@/lib/api/client";
import { mockApi, type MockScenario } from "@/mocks/handlers";
import type { DemoScenario, Role } from "@/types/api";

const USERNAME: Record<Role, string> = { LANDLORD: "landlord", TENANT: "tenant" };

const SCENARIO: Record<MockScenario, DemoScenario> = {
  fresh: "fresh",
  invited: "waiting_accept",
  locked: "funds_locked",
  "booking-released": "booking_released",
  released: "released",
};

export async function demoLogin(role: Role): Promise<void> {
  if (env.useMock) return mockApi.setRole(role);
  await api.post("/auth/demo-login", { username: USERNAME[role] });
}

export async function logout(): Promise<void> {
  if (env.useMock) return;
  await api.post("/auth/logout");
}

export async function demoReset(scenario: MockScenario): Promise<void> {
  if (env.useMock) return mockApi.reset(scenario);
  await api.post("/demo/reset", null, { params: { scenario: SCENARIO[scenario] } });
}

export function hardNavigate(path: string) {
  window.location.replace(path);
}
