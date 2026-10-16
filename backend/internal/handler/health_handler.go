// Package handler รับ HTTP เท่านั้น: parse/validate → เรียก service → ส่ง JSON (ห้ามแตะ DB ตรง)
package handler

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
)

// Pinger คือสิ่งที่ /readyz ใช้เช็ก DB (pgxpool.Pool ทำได้อยู่แล้ว)
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

// Live — GET /healthz: process ยังตอบได้ (ไม่แตะ DB)
func (h *HealthHandler) Live(c fiber.Ctx) error {
	return c.JSON(healthResponse{Status: "ok"})
}

// Ready — GET /readyz: ต่อ DB ได้ภายใน 2 วินาที
func (h *HealthHandler) Ready(c fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()
	if err := h.db.Ping(ctx); err != nil {
		return domain.Wrap(domain.CodeNotReady, "ฐานข้อมูลยังไม่พร้อม", err)
	}
	return c.JSON(healthResponse{Status: "ready"})
}
