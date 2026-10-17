
const pending = new Map<string, string>();

export function idempotencyKey(scope: string): string {
  let key = pending.get(scope);
  if (!key) {
    key = crypto.randomUUID();
    pending.set(scope, key);
  }
  return key;
}

export function releaseIdempotencyKey(scope: string): void {
  pending.delete(scope);
}

export const idemHeaders = (key: string) => ({ headers: { "Idempotency-Key": key } });
