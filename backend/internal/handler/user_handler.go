package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

// UserHandler: GET /me, GET /home, GET /properties
type UserHandler struct {
	users *service.UserService
}

func NewUserHandler(users *service.UserService) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) Me(c fiber.Ctx) error {
	out, err := h.users.Me(c.Context(), middleware.ActorFrom(c))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *UserHandler) Home(c fiber.Ctx) error {
	out, err := h.users.Home(c.Context(), middleware.ActorFrom(c))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *UserHandler) Properties(c fiber.Ctx) error {
	out, err := h.users.Properties(c.Context(), middleware.ActorFrom(c))
	if err != nil {
		return err
	}
	return c.JSON(out)
}
