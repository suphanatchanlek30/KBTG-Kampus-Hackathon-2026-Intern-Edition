package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type NotificationHandler struct {
	notifications *service.NotificationService
}

func NewNotificationHandler(n *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifications: n}
}

// List — GET /notifications
func (h *NotificationHandler) List(c fiber.Ctx) error {
	out, err := h.notifications.List(c.Context(), middleware.ActorFrom(c))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type markReadRequest struct {
	IDs []string `json:"ids"`
	All bool     `json:"all"`
}

func (h *NotificationHandler) MarkRead(c fiber.Ctx) error {
	var req markReadRequest
	if err := c.Bind().JSON(&req); err != nil {
		return domain.Wrap(domain.CodeValidationFailed, "รูปแบบข้อมูลไม่ถูกต้อง", err)
	}
	out, err := h.notifications.MarkRead(c.Context(), middleware.ActorFrom(c), req.IDs, req.All)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
