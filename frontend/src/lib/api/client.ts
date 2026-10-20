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
    // /play is signing this browser in; a 401 from other calls on that page is expected.
    if (status === 401 && !err.config?.url?.startsWith("/auth/") && window.location.pathname !== "/play") {
      // Visitors get their own sandbox. Only a browser that picked a shared account returns to /login.
      const target = sharedLoginChosen() ? "/login" : "/play";
      if (window.location.pathname !== target) window.location.replace(target);
    }
    return Promise.reject(new ApiError(e?.code ?? "UNKNOWN", status, e?.message, e?.requestId));
  },
);

function sharedLoginChosen(): boolean {
  try {
    return localStorage.getItem("ksure.sandbox") === "0";
  } catch {
    return false;
  }
}
