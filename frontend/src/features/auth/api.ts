import { env } from "@/config/env";
import { api } from "@/lib/api/client";
import { mockApi, type MockScenario } from "@/mocks/handlers";
import { ApiError } from "@/lib/api/errors";
import { readSandboxFlag, writeSandboxFlag } from "@/lib/sandbox-flag";
import type { DemoScenario, Role, SandboxDTO } from "@/types/api";

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

/**
 * Remembers where this browser signs in again after its session ends.
 * Off means it picked a shared account on /login; anything else goes to its own sandbox on /play.
 */
export function setSandboxFlag(on: boolean) {
  try {
    writeSandboxFlag(on ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the flag is only a convenience.
  }
}

export function hasSandboxFlag(): boolean {
  try {
    return readSandboxFlag() !== "0";
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Creates a private demo sandbox and signs in as its tenant. Retries while the server is busy. */
export async function startSandbox(scenario: DemoScenario = "waiting_accept"): Promise<SandboxDTO> {
  setSandboxFlag(true); // Set first, so a 401 elsewhere during setup also leads back to /play.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await api.post<SandboxDTO>("/demo/sandbox", null, { params: { scenario } });
      return res.data;
    } catch (err) {
      const busy = err instanceof ApiError && (err.status === 429 || err.isNetwork);
      if (!busy || attempt >= 6) throw err;
      await sleep(400 * 2 ** attempt + Math.random() * 300);
    }
  }
}
