
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  FORBIDDEN_ROLE: "บัญชีนี้ทำรายการนี้ไม่ได้",
  NOT_DEAL_PARTY: "คุณไม่ใช่คู่ดีลของรายการนี้",
  NOT_FOUND: "ไม่พบข้อมูลดีลนี้",
  DEAL_STATE_CONFLICT: "สถานะดีลเปลี่ยนไปแล้ว ลองรีเฟรชหน้า",
  VERSION_MISMATCH: "ข้อมูลไม่เป็นปัจจุบัน ลองรีเฟรชหน้า",
  INSUFFICIENT_BALANCE: "ยอดเงินที่ใช้ได้ไม่พอ",
  INVITE_EXPIRED: "คำเชิญนี้หมดอายุแล้ว",
  VALIDATION_FAILED: "ข้อมูลไม่ถูกต้อง",
  RATE_LIMITED: "ลองบ่อยเกินไป กรุณารอสักครู่",
  IDEMPOTENCY_KEY_REQUIRED: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
  IDEMPOTENCY_CONFLICT: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
  NETWORK: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง",
};

const FALLBACK = "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
    public readonly requestId?: string,
  ) {
    super(message || MESSAGES[code] || FALLBACK);
    this.name = "ApiError";
  }

  get isNetwork() {
    return this.code === "NETWORK";
  }
}

export const errorMessage = (err: unknown) => {
  if (!(err instanceof ApiError)) return FALLBACK;
  return err.status >= 500 && err.requestId ? `${err.message} (รหัสอ้างอิง ${err.requestId.slice(0, 8)})` : err.message;
};
