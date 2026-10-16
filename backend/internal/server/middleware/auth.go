package middleware

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/session"
)

type actorKey struct{}

// Auth อ่าน cookie ks_session → ตรวจ JWT → เก็บ Actor ไว้ใน context · ไม่มี/ผิด/หมดอายุ = 401
func Auth(sessions *session.Manager) fiber.Handler {
	return func(c fiber.Ctx) error {
		raw := c.Cookies(session.CookieName)
		if raw == "" {
			return domain.NewError(domain.CodeUnauthenticated, "กรุณาเข้าสู่ระบบ")
		}
		actor, err := sessions.Parse(raw)
		if err != nil {
			return domain.Wrap(domain.CodeUnauthenticated, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง", err)
		}
		fiber.Locals(c, actorKey{}, actor)
		return c.Next()
	}
}

// RequireRole ให้ผ่านเฉพาะ role ที่ระบุ — ต้องวางหลัง Auth
func RequireRole(role domain.Role) fiber.Handler {
	return func(c fiber.Ctx) error {
		if ActorFrom(c).Role != role {
			return domain.NewError(domain.CodeForbiddenRole, "บัญชีนี้ทำรายการนี้ไม่ได้")
		}
		return c.Next()
	}
}

// ActorFrom คืนผู้ใช้ที่ล็อกอินอยู่ (zero value ถ้า route ไม่ได้ผ่าน Auth)
func ActorFrom(c fiber.Ctx) domain.Actor {
	return fiber.Locals[domain.Actor](c, actorKey{})
}
