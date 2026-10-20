package server

import (
	"errors"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/handler"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/session"
	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type Deps struct {
	Log            *slog.Logger
	DB             handler.Pinger
	Sessions       *session.Manager
	CookieSecure   bool
	Users          *service.UserService
	Notifications  *service.NotificationService
	Deals          *service.DealService
	Transfers      *service.TransferService
	Demo           *service.DemoService
	SandboxEnabled bool
}

func New(deps Deps) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "ksure-api",
		ErrorHandler: errorHandler(deps.Log),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	})

	app.Use(requestid.New())
	app.Use(middleware.RequestLogger(deps.Log))
	app.Use(recover.New())

	registerRoutes(app, deps)
	return app
}

type errorBody struct {
	Error errorPayload `json:"error"`
}

type errorPayload struct {
	Code      domain.Code         `json:"code"`
	Message   string              `json:"message"`
	RequestID string              `json:"requestId"`
	Details   []domain.FieldError `json:"details,omitempty"`
}

func errorHandler(log *slog.Logger) fiber.ErrorHandler {
	return func(c fiber.Ctx, err error) error {
		appErr, ok := domain.AsAppError(err)
		if !ok {
			var fe *fiber.Error
			switch {
			case errors.As(err, &fe) && fe.Code == fiber.StatusNotFound:
				appErr = domain.NewError(domain.CodeNotFound, "ไม่พบสิ่งที่ต้องการ")
			case errors.As(err, &fe) && fe.Code == fiber.StatusMethodNotAllowed:
				appErr = domain.NewError(domain.CodeNotFound, "ไม่พบสิ่งที่ต้องการ")
			case errors.As(err, &fe) && fe.Code < fiber.StatusInternalServerError:
				appErr = domain.NewError(domain.CodeValidationFailed, "คำขอไม่ถูกต้อง")
			default:
				appErr = domain.Wrap(domain.CodeInternal, "ระบบขัดข้อง ลองใหม่อีกครั้ง", err)
			}
		}
		if appErr.Code == domain.CodeInternal {
			log.Error("internal error", "request_id", requestid.FromContext(c), "error", err.Error())
		}
		return c.Status(appErr.Status()).JSON(errorBody{Error: errorPayload{
			Code:      appErr.Code,
			Message:   appErr.Message,
			RequestID: requestid.FromContext(c),
			Details:   appErr.Details,
		}})
	}
}
