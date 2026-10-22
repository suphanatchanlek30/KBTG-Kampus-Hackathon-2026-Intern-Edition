package handler

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
)

type Pinger interface {
	Ping(ctx context.Context) error
}

type HealthHandler struct {
	db Pinger
}

func NewHealthHandler(db Pinger) *HealthHandler {
	return &HealthHandler{db: db}
}

type healthResponse struct {
	Status string `json:"status"`
}

func (h *HealthHandler) Live(c fiber.Ctx) error {
	return c.JSON(healthResponse{Status: "ok"})
}

func (h *HealthHandler) Ready(c fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()
	if err := h.db.Ping(ctx); err != nil {
		return domain.Wrap(domain.CodeNotReady, "ฐานข้อมูลยังไม่พร้อม", err)
	}
	return c.JSON(healthResponse{Status: "ready"})
}
