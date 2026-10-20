package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/session"
)

// PerSessionRateLimit limits each login session separately. Demo accounts are shared
// by many people at once, so a per-user limit would block everyone after a few scans.
func PerSessionRateLimit(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		KeyGenerator: func(c fiber.Ctx) string {
			sum := sha256.Sum256([]byte(c.Cookies(session.CookieName)))
			return ActorFrom(c).UserID.String() + ":" + hex.EncodeToString(sum[:16])
		},
		LimitReached: func(fiber.Ctx) error {
			return domain.NewError(domain.CodeRateLimited, "ลองบ่อยเกินไป กรุณารอสักครู่")
		},
	})
}
