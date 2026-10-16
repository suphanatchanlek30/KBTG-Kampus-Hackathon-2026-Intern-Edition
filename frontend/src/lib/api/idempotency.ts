// Idempotency-Key ต่อ "การกดหนึ่งครั้ง" (docs/05-api.md §1)
// การกดเดียวกัน (scope เดิม) ที่ยังไม่สำเร็จ — เช่น เน็ตหลุดแล้ว retry หรือกดซ้ำ — ใช้ key เดิม server จึงทำแค่ครั้งเดียว
// สำเร็จ หรือ server ตอบว่าทำไม่ได้ (4xx) แล้ว → ทิ้ง key การกดครั้งถัดไปได้ key ใหม่

const pending = new Map<string, string>();

/** key ของ action นี้ เช่น scope = "confirm-viewing:<dealId>:v2" */
export function idempotencyKey(scope: string): string {
  let key = pending.get(scope);
  if (!key) {
    key = crypto.randomUUID();
    pending.set(scope, key);
  }
  return key;
}

/** จบ action แล้ว (สำเร็จหรือถูกปฏิเสธถาวร) — ครั้งหน้าจะได้ key ใหม่ */
export function releaseIdempotencyKey(scope: string): void {
  pending.delete(scope);
}

export const idemHeaders = (key: string) => ({ headers: { "Idempotency-Key": key } });
