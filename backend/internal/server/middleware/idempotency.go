package middleware

import (
	"crypto/sha256"
	"encoding/hex"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

const maxIdempotencyKeyLen = 255

type idemKey struct{}

// Idempotency บังคับ header Idempotency-Key บน route ที่เปลี่ยนเงิน/state (🔁 ใน docs/05-api.md)
// และคำนวณ hash ของ method + path + body — key เดิมแต่ hash ต่าง = IDEMPOTENCY_CONFLICT (ตรวจใน service)
func Idempotency() fiber.Handler {
	return func(c fiber.Ctx) error {
		key := c.Get("Idempotency-Key")
		if key == "" || len(key) > maxIdempotencyKeyLen {
			return domain.NewError(domain.CodeIdempotencyKeyRequired, "ต้องส่ง Idempotency-Key")
		}
		h := sha256.New()
		h.Write([]byte(c.Method() + " " + c.Path() + "\n"))
		h.Write(c.Body())
		fiber.Locals(c, idemKey{}, service.IdemRequest{
			Key:         key,
			MethodPath:  c.Method() + " " + c.Route().Path,
			RequestHash: hex.EncodeToString(h.Sum(nil)),
		})
		return c.Next()
	}
}

// IdempotencyFrom คืนข้อมูล idempotency ของ request (route ต้องผ่าน Idempotency ก่อน)
func IdempotencyFrom(c fiber.Ctx) service.IdemRequest {
	return fiber.Locals[service.IdemRequest](c, idemKey{})
}
