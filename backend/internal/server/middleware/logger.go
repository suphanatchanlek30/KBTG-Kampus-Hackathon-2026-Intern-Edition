// Package middleware รวม middleware ของ API: request log (และ auth / role guard / idempotency ใน Phase 5–6)
package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

// RequestLogger log ทุก request เป็น JSON บรรทัดเดียว
// ไม่ log query string/body และใช้ path แบบ pattern (/invites/:code) — path จริงอาจมี invite token หรือ share code
// ต้องวางหลัง requestid และหลัง error handler ทำงานแล้ว จึงอ่าน status จริงได้
func RequestLogger(log *slog.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		if err != nil {
			// ให้ error handler กลางเขียน response ก่อน แล้วค่อยอ่าน status
			if hErr := c.App().Config().ErrorHandler(c, err); hErr != nil {
				_ = c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		status := c.Response().StatusCode()
		level := slog.LevelInfo
		if status >= fiber.StatusInternalServerError {
			level = slog.LevelError
		}
		attrs := []any{
			"request_id", requestid.FromContext(c),
			"method", c.Method(),
			"path", logPath(c),
			"status", status,
			"latency_ms", time.Since(start).Milliseconds(),
		}
		if err != nil {
			attrs = append(attrs, "error", err.Error())
		}
		log.Log(c.Context(), level, "request", attrs...)
		return nil
	}
}

// logPath = pattern ของ route ที่ตรง · ไม่ตรง route ไหนเลย (404 — Route() ค้างที่ middleware "/") ใช้ path จริง
func logPath(c fiber.Ctx) string {
	if r := c.Route(); r != nil && r.Path != "" && r.Path != "/" {
		return r.Path
	}
	return c.Path()
}
