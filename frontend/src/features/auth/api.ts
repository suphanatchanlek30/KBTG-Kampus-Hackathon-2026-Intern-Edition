// ล็อกอินเดโม / รีเซ็ตข้อมูล — ทำงานได้ทั้งโหมด mock และ API จริง
import { env } from "@/config/env";
import { api } from "@/lib/api/client";
import { mockApi, type MockScenario } from "@/mocks/handlers";
import type { DemoScenario, Role } from "@/types/api";

const USERNAME: Record<Role, string> = { LANDLORD: "landlord", TENANT: "tenant" };

// Demo tools ใช้ชื่อ scenario ของ mock — แปลงเป็นชื่อฝั่ง backend (docs/04-database.md §5)
const SCENARIO: Record<MockScenario, DemoScenario> = {
  fresh: "fresh",
  invited: "waiting_accept",
  locked: "funds_locked",
  "booking-released": "booking_released",
  released: "released",
};

/** ล็อกอินเป็น role นี้ (API จริง: ได้ cookie ks_session ใหม่ แทนของเดิม) */
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

/**
 * ไปหน้าใหม่แบบโหลดทั้งหน้า — ใช้หลังเปลี่ยนผู้ใช้ เพราะ Cache Components เก็บหน้าเก่าไว้ใน <Activity>
 * (state ของผู้ใช้คนก่อนจะไม่ค้าง — node_modules/next/dist/docs: preserving-ui-state "State and authentication")
 */
export function hardNavigate(path: string) {
  window.location.replace(path);
}
