import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "./errors";

describe("ApiError", () => {
  it("prefers the server's Thai message", () => {
    expect(new ApiError("INSUFFICIENT_BALANCE", 422, "ยอดเงินที่ใช้ได้ไม่พอสำหรับกันเงิน").message).toBe(
      "ยอดเงินที่ใช้ได้ไม่พอสำหรับกันเงิน",
    );
  });

  it("falls back to the code table, then a generic message", () => {
    expect(new ApiError("NOT_DEAL_PARTY", 403).message).toBe("คุณไม่ใช่คู่ดีลของรายการนี้");
    expect(new ApiError("SOMETHING_NEW", 400).message).toBe("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
  });

  it("adds a short reference to server errors", () => {
    expect(errorMessage(new ApiError("INTERNAL", 500, "ระบบขัดข้อง", "abcdef1234567890"))).toBe(
      "ระบบขัดข้อง (รหัสอ้างอิง abcdef12)",
    );
    expect(errorMessage(new Error("boom"))).toBe("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
  });
});
