export const env = {
  useMock: process.env.NEXT_PUBLIC_USE_MOCK !== "false",
  showDemoBadge: process.env.NEXT_PUBLIC_SHOW_DEMO_BADGE !== "false",
  pollMs: Number(process.env.NEXT_PUBLIC_POLL_MS ?? 2000),
  isDev: process.env.NODE_ENV !== "production",
} as const;
