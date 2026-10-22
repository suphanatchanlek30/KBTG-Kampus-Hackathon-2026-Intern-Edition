const SHARE_CODE_PATTERN = /^KS-[A-Z0-9]{6}$/i;

/**
 * Extract the invitation identifier from the two QR formats that P Sure emits:
 * a share code (KS-XXXXXX) or a P Sure invitation URL.
 */
export function invitationIdFromScan(rawValue: string): string | null {
  const value = rawValue.trim();

  if (SHARE_CODE_PATTERN.test(value)) {
    return value.toUpperCase();
  }

  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/invites\/([^/]+)\/?$/);
    const invitationId = match?.[1] ? decodeURIComponent(match[1]).trim() : "";

    return invitationId || null;
  } catch {
    return null;
  }
}
