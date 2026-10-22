package handler

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/session"
	"github.com/suphanatchanlek30/psure/backend/internal/service"
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
	// Switching roles inside a sandbox keeps the visitor in their own sandbox.
	var sandbox uuid.NullUUID
	if prev, err := h.sessions.Parse(c.Cookies(session.CookieName)); err == nil {
		sandbox = prev.SandboxID
	}
	actor, out, err := h.users.Login(c.Context(), req.Username, sandbox)
	if err != nil {
		return err
	}
	if err := h.setSession(c, actor); err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *AuthHandler) setSession(c fiber.Ctx, actor domain.Actor) error {
	tok, expiresAt, err := h.sessions.Issue(actor)
	if err != nil {
		return err
	}
	ck := h.cookie(tok)
	ck.Expires = expiresAt
	ck.MaxAge = int(h.sessions.TTL().Seconds())
	c.Cookie(ck)
	return nil
}

func (h *AuthHandler) Logout(c fiber.Ctx) error {
	ck := h.cookie("")
	ck.Expires = time.Unix(0, 0) // Expire the cookie in the browser.
	c.Cookie(ck)
	return c.SendStatus(fiber.StatusNoContent)
}

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
