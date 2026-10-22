package middleware

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/session"
)

type actorKey struct{}

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

func RequireRole(role domain.Role) fiber.Handler {
	return func(c fiber.Ctx) error {
		if ActorFrom(c).Role != role {
			return domain.NewError(domain.CodeForbiddenRole, "บัญชีนี้ทำรายการนี้ไม่ได้")
		}
		return c.Next()
	}
}

func ActorFrom(c fiber.Ctx) domain.Actor {
	return fiber.Locals[domain.Actor](c, actorKey{})
}
