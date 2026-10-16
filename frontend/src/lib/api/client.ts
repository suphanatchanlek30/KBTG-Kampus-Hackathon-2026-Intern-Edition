import axios, { isAxiosError } from "axios";
import { ApiError } from "./errors";

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
    if (isAxiosError<{ error?: { code?: string; message?: string } }>(err)) {
      if (!err.response) return Promise.reject(new ApiError("NETWORK", 0));
      const { status, data } = err.response;
      return Promise.reject(new ApiError(data?.error?.code ?? "UNKNOWN", status));
    }
    return Promise.reject(err);
  },
);
