// ตัวแปร NEXT_PUBLIC_* ต้องอ้างชื่อเต็มตรงๆ ให้ Next แทนค่าตอน build ได้
export const env = {
  useMock: process.env.NEXT_PUBLIC_USE_MOCK !== "false",
  showDemoBadge: process.env.NEXT_PUBLIC_SHOW_DEMO_BADGE !== "false",
  pollMs: Number(process.env.NEXT_PUBLIC_POLL_MS ?? 2000),
  isDev: process.env.NODE_ENV !== "production",
} as const;
