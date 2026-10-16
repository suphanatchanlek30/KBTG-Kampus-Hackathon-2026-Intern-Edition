// รหัส error ตาม docs/05-api.md §1 → ข้อความไทยที่แสดงใน toast

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  FORBIDDEN: "คุณไม่มีสิทธิ์ทำรายการนี้",
  NOT_FOUND: "ไม่พบข้อมูลดีลนี้",
  DEAL_STATE_CONFLICT: "สถานะดีลเปลี่ยนไปแล้ว ลองรีเฟรชหน้า",
  VERSION_MISMATCH: "ข้อมูลไม่เป็นปัจจุบัน ลองรีเฟรชหน้า",
  INSUFFICIENT_FUNDS: "ยอดเงินที่ใช้ได้ไม่พอ",
  INVITE_EXPIRED: "คำเชิญนี้หมดอายุแล้ว",
  INVITE_INVALID: "รหัสดีลไม่ถูกต้อง",
  VALIDATION_FAILED: "ข้อมูลไม่ถูกต้อง",
  NETWORK: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง",
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? MESSAGES[code] ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    this.name = "ApiError";
  }
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
