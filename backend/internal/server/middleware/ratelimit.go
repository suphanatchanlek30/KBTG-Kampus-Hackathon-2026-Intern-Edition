package middleware

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
)

// PerUserRateLimit จำกัดจำนวนครั้งต่อผู้ใช้ (ต้องวางหลัง Auth) — ใช้กับ GET /invites กันการสุ่มเดารหัสดีล
func PerUserRateLimit(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:          max,
		Expiration:   window,
		KeyGenerator: func(c fiber.Ctx) string { return ActorFrom(c).UserID.String() },
		LimitReached: func(fiber.Ctx) error {
			return domain.NewError(domain.CodeRateLimited, "ลองบ่อยเกินไป กรุณารอสักครู่")
		},
	})
}
