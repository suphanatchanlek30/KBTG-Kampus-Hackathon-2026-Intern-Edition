package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

func RequestLogger(log *slog.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		if err != nil {
			if hErr := c.App().Config().ErrorHandler(c, err); hErr != nil {
				_ = c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		status := c.Response().StatusCode()
		if status < fiber.StatusInternalServerError && isProbe(c.Path()) {
			return nil // Health probes run constantly; logging them only adds noise and I/O.
		}
		level := slog.LevelInfo
		if status >= fiber.StatusInternalServerError {
			level = slog.LevelError
		}
		attrs := []any{
			"request_id", requestid.FromContext(c),
			"method", c.Method(),
			"path", logPath(c),
			"status", status,
			"latency_ms", time.Since(start).Milliseconds(),
		}
		if err != nil {
			attrs = append(attrs, "error", err.Error())
		}
		log.Log(c.Context(), level, "request", attrs...)
		return nil
	}
}

func logPath(c fiber.Ctx) string {
	if r := c.Route(); r != nil && r.Path != "" && r.Path != "/" {
		return r.Path
	}
	return c.Path()
}

func isProbe(path string) bool {
	return path == "/api/v1/healthz" || path == "/api/v1/readyz"
}
