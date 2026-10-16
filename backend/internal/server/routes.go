package server

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/handler"
)

// registerRoutes ผูก path → handler ตาม docs/05-api.md §2 (เพิ่มทีละ Phase)
func registerRoutes(app *fiber.App, deps Deps) {
	v1 := app.Group("/api/v1")

	health := handler.NewHealthHandler(deps.DB)
	v1.Get("/healthz", health.Live)
	v1.Get("/readyz", health.Ready)
}
