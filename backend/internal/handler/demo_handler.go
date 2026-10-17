package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type DemoHandler struct {
	demo *service.DemoService
}

func NewDemoHandler(demo *service.DemoService) *DemoHandler {
	return &DemoHandler{demo: demo}
}

func (h *DemoHandler) Reset(c fiber.Ctx) error {
	sc := service.Scenario(c.Query("scenario", string(service.ScenarioFresh)))
	out, err := h.demo.Reset(c.Context(), sc)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
