
export function maskAccount(last4: string): string {
  if (!/^\d{4}$/.test(last4)) throw new RangeError(`maskAccount expects 4 digits, got "${last4}"`);
  return `xxx-x-x${last4}`;
}

export function shortName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ");
  if (!last) return first;
  return `${first} ${[...last][0]}.`;
}

export function formatShareCode(code: string): string {
  return code.trim().toUpperCase();
}
