package server

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/handler"
	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
)

func registerRoutes(app *fiber.App, deps Deps) {
	v1 := app.Group("/api/v1")

	health := handler.NewHealthHandler(deps.DB)
	v1.Get("/healthz", health.Live)
	v1.Get("/readyz", health.Ready)

	if deps.Users == nil {
		return
	}

	auth := handler.NewAuthHandler(deps.Users, deps.Sessions, deps.CookieSecure)
	v1.Post("/auth/demo-login", auth.Login)
	v1.Post("/auth/logout", auth.Logout)

	authed := middleware.Auth(deps.Sessions)
	landlordOnly := middleware.RequireRole(domain.RoleLandlord)

	users := handler.NewUserHandler(deps.Users)
	v1.Get("/me", authed, users.Me)
	v1.Get("/home", authed, users.Home)
	v1.Get("/properties", authed, landlordOnly, users.Properties)

	notifications := handler.NewNotificationHandler(deps.Notifications)
	v1.Get("/notifications", authed, notifications.List)
	v1.Post("/notifications/read", authed, notifications.MarkRead)

	deals := handler.NewDealHandler(deps.Deals)
	tenantOnly := middleware.RequireRole(domain.RoleTenant)
	idem := middleware.Idempotency()
	v1.Get("/deals", authed, deals.List)
	v1.Post("/deals", authed, landlordOnly, idem, deals.Create)
	v1.Get("/deals/:id", authed, deals.Get)
	v1.Post("/deals/:id/invite", authed, landlordOnly, idem, deals.ReissueInvite)
	v1.Post("/deals/:id/invite/send", authed, landlordOnly, idem, deals.SendInvite)
	v1.Post("/deals/:id/reject", authed, tenantOnly, idem, deals.Reject)
	v1.Post("/deals/:id/lock", authed, tenantOnly, idem, deals.Lock)
	v1.Post("/deals/:id/confirm-viewing", authed, tenantOnly, idem, deals.ConfirmViewing)
	v1.Post("/deals/:id/confirm-move-in", authed, tenantOnly, idem, deals.ConfirmMoveIn)
	v1.Post("/deals/:id/cancel", authed, idem, deals.Cancel)
	v1.Post("/deals/:id/report-issue", authed, tenantOnly, idem, deals.ReportIssue)
	v1.Get("/deals/:id/calendar.ics", authed, deals.Calendar)
	v1.Get("/users/lookup", authed, landlordOnly, deals.LookupUser)
	v1.Get("/invites/:code", authed, tenantOnly, middleware.PerSessionRateLimit(30, time.Minute), deals.PreviewInvite)

	transfers := handler.NewTransferHandler(deps.Transfers)
	v1.Get("/transfers/payees", authed, transfers.Payees)
	v1.Post("/transfers/precheck", authed, transfers.Precheck)
	v1.Post("/transfers", authed, idem, transfers.Create)

	if deps.Demo != nil {
		demo := handler.NewDemoHandler(deps.Demo, auth)
		v1.Post("/demo/reset", authed, demo.Reset)
		if deps.SandboxEnabled {
			v1.Post("/demo/sandbox", middleware.GlobalRateLimit(100, time.Second), demo.StartSandbox)
		}
		v1.Post("/demo/deals/:id/expire-now", authed, deals.ExpireNow)
	}
}
