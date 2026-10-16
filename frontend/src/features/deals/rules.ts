// กติกาของดีลที่ frontend ต้องคำนวณเพื่อแสดงตัวอย่างก่อนสร้าง (server คำนวณซ้ำเสมอ — docs/05-api.md #8)

/** หมดอายุ = วันเข้าอยู่ + 2 วัน 23:59 (+07) ตาม docs/05-api.md #8 */
export function dealExpiry(moveInDate: string): string {
  const d = new Date(`${moveInDate}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + 2);
  const bkk = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  return `${bkk}T23:59:00+07:00`;
}
