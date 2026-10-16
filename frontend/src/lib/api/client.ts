import axios, { isAxiosError } from "axios";
import { ApiError } from "./errors";

type ErrorBody = { error?: { code?: string; message?: string; requestId?: string } };

// เรียกผ่าน Next rewrites (/api/* → backend) → same-origin, cookie ใช้ได้ (docs/03-architecture.md §3.2)
export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] ??= crypto.randomUUID();
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (!isAxiosError<ErrorBody>(err)) return Promise.reject(err);
    if (!err.response) return Promise.reject(new ApiError("NETWORK", 0));

    const { status, data } = err.response;
    const e = data?.error;
    // cookie หาย/หมดอายุ → ไปล็อกอิน (โหลดหน้าใหม่ทั้งหน้า ล้าง state ของผู้ใช้เดิมที่ค้างใน <Activity>)
    if (status === 401 && !err.config?.url?.startsWith("/auth/") && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    return Promise.reject(new ApiError(e?.code ?? "UNKNOWN", status, e?.message, e?.requestId));
  },
);
