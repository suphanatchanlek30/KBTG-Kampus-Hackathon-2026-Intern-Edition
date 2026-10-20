import axios, { isAxiosError } from "axios";
import { ApiError } from "./errors";

type ErrorBody = { error?: { code?: string; message?: string; requestId?: string } };

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
    if (status === 401 && !err.config?.url?.startsWith("/auth/")) {
      // A visitor whose sandbox expired gets a fresh one instead of the shared login.
      const target = sandboxFlagSet() ? "/play" : "/login";
      if (window.location.pathname !== target) window.location.replace(target);
    }
    return Promise.reject(new ApiError(e?.code ?? "UNKNOWN", status, e?.message, e?.requestId));
  },
);

function sandboxFlagSet(): boolean {
  try {
    return localStorage.getItem("ksure.sandbox") === "1";
  } catch {
    return false;
  }
}
