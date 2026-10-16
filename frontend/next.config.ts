import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ปุ่ม dev indicator บังมุมล่างซ้าย (bottom nav) ตอนเทียบ mockup ใน /dev/overlay
  devIndicators: false,
  // เปิดจากมือถือผ่าน IP ในวง LAN ตอน dev (http://<IP เครื่อง>:3000) — Next บล็อก origin อื่นนอกจาก localhost
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // browser เรียก /api/* ที่ origin เดียวกัน → ไม่ต้องตั้ง CORS, cookie ใช้ได้ (docs/03-architecture.md §3.2)
  // Phase 7 จะเปลี่ยนเป็นเช็ก session แล้วส่งไป /login (D0) หรือ /home
  async redirects() {
    return [{ source: "/", destination: "/home", permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
