const KEY = "psure.sandbox";
// Browsers that used the app before the P Sure rename still hold the old key.
const LEGACY_KEY = "ksure.sandbox";

/** "1" = own sandbox, "0" = picked a shared account, null = never chose. Throws if storage is unavailable. */
export function readSandboxFlag(): string | null {
  return localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
}

export function writeSandboxFlag(value: "0" | "1") {
  localStorage.setItem(KEY, value);
  localStorage.removeItem(LEGACY_KEY);
}
