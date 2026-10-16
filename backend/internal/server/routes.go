package server

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/handler"
	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
)

// registerRoutes ผูก path → handler ตาม docs/05-api.md §2 (เพิ่มทีละ Phase)
func registerRoutes(app *fiber.App, deps Deps) {
	v1 := app.Group("/api/v1")

	health := handler.NewHealthHandler(deps.DB)
	v1.Get("/healthz", health.Live)
	v1.Get("/readyz", health.Ready)

	// ส่วนที่เหลือต้องมี service — test ของ health สร้าง app โดยไม่ส่งมา
	if deps.Users == nil {
		return
	}

	auth := handler.NewAuthHandler(deps.Users, deps.Sessions, deps.CookieSecure)
	v1.Post("/auth/demo-login", auth.Login)
	v1.Post("/auth/logout", auth.Logout)

	// ทุก route ข้างล่างต้องล็อกอิน (cookie ks_session) — ผูกราย route ไม่ใช้ Group.Use
	// เพื่อให้ path ที่ไม่มีอยู่จริงยังได้ 404 ไม่ใช่ 401
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
	v1.Get("/users/lookup", authed, landlordOnly, deals.LookupUser)
	// 30 ครั้ง/นาที/ผู้ใช้ — พอสำหรับคนจริง แต่สุ่มเดา share code (32^6 แบบ) ไม่ได้
	v1.Get("/invites/:code", authed, tenantOnly, middleware.PerUserRateLimit(30, time.Minute), deals.PreviewInvite)

	if deps.Demo != nil {
		demo := handler.NewDemoHandler(deps.Demo)
		v1.Post("/demo/reset", authed, demo.Reset)
	}
}
