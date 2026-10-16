package handler

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/session"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type AuthHandler struct {
	users        *service.UserService
	sessions     *session.Manager
	cookieSecure bool
}

func NewAuthHandler(users *service.UserService, sessions *session.Manager, cookieSecure bool) *AuthHandler {
	return &AuthHandler{users: users, sessions: sessions, cookieSecure: cookieSecure}
}

type loginRequest struct {
	Username string `json:"username"`
}

// Login — POST /auth/demo-login { username } → Set-Cookie ks_session
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().JSON(&req); err != nil {
		return domain.Wrap(domain.CodeValidationFailed, "รูปแบบข้อมูลไม่ถูกต้อง", err)
	}
	actor, out, err := h.users.Login(c.Context(), req.Username)
	if err != nil {
		return err
	}
	tok, expiresAt, err := h.sessions.Issue(actor)
	if err != nil {
		return err
	}
	ck := h.cookie(tok)
	ck.Expires = expiresAt
	ck.MaxAge = int(h.sessions.TTL().Seconds())
	c.Cookie(ck)
	return c.JSON(out)
}

// Logout — POST /auth/logout: ลบ cookie (ไม่ต้องล็อกอินก็เรียกได้)
func (h *AuthHandler) Logout(c fiber.Ctx) error {
	ck := h.cookie("")
	ck.Expires = time.Unix(0, 0) // วันที่ในอดีต = browser ลบ cookie ทิ้ง
	c.Cookie(ck)
	return c.SendStatus(fiber.StatusNoContent)
}

// cookie: HttpOnly (JS อ่านไม่ได้) · SameSite=Lax · Secure เมื่อเดโมผ่าน HTTPS
func (h *AuthHandler) cookie(value string) *fiber.Cookie {
	return &fiber.Cookie{
		Name:     session.CookieName,
		Value:    value,
		Path:     "/",
		HTTPOnly: true,
		Secure:   h.cookieSecure,
		SameSite: fiber.CookieSameSiteLaxMode,
	}
}
