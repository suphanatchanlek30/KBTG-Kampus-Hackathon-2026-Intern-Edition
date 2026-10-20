package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type DemoHandler struct {
	demo *service.DemoService
	auth *AuthHandler
}

func NewDemoHandler(demo *service.DemoService, auth *AuthHandler) *DemoHandler {
	return &DemoHandler{demo: demo, auth: auth}
}

// StartSandbox — POST /demo/sandbox?scenario= : creates a private sandbox and signs in as its tenant.
func (h *DemoHandler) StartSandbox(c fiber.Ctx) error {
	sc := service.Scenario(c.Query("scenario", string(service.ScenarioWaitingAccept)))
	actor, out, err := h.demo.CreateSandbox(c.Context(), sc)
	if err != nil {
		return err
	}
	if err := h.auth.setSession(c, actor); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}

func (h *DemoHandler) Reset(c fiber.Ctx) error {
	sc := service.Scenario(c.Query("scenario", string(service.ScenarioFresh)))
	out, err := h.demo.Reset(c.Context(), middleware.ActorFrom(c), sc)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
