// ข้อความเกี่ยวกับบัญชี/ตัวตน (docs/02-ui-spec.md §3.3)

/** เลขบัญชีปิดบังเสมอ: รับแค่ 4 ตัวท้าย → `xxx-x-x4821` */
export function maskAccount(last4: string): string {
  if (!/^\d{4}$/.test(last4)) throw new RangeError(`maskAccount expects 4 digits, got "${last4}"`);
  return `xxx-x-x${last4}`;
}

/** `สมชาย ใจดี` → `สมชาย ใ.` (ชื่อ + อักษรตัวแรกของนามสกุล + จุด — ตาม mockup รวมสระหน้าด้วย) */
export function shortName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ");
  if (!last) return first;
  return `${first} ${[...last][0]}.`;
}

/** รหัสดีล `KS-8F4Q21` — ให้ UI ใส่ letter-spacing เอง ฟังก์ชันนี้แค่ normalize */
export function formatShareCode(code: string): string {
  return code.trim().toUpperCase();
}
