package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

// path ใน log ต้องเป็น pattern — invite token ใน path ห้ามหลุดลง log
func TestRequestLoggerHidesPathParams(t *testing.T) {
	var buf bytes.Buffer
	app := fiber.New()
	app.Use(RequestLogger(slog.New(slog.NewJSONHandler(&buf, nil))))
	app.Get("/api/v1/invites/:code", func(c fiber.Ctx) error { return c.SendStatus(http.StatusOK) })

	const secret = "s3cr3t-invite-token-AAAAAAAAAAAAAAAAAAAAAAAAAA"
	for _, path := range []string{"/api/v1/invites/" + secret, "/api/v1/nope"} {
		if _, err := app.Test(httptest.NewRequest(http.MethodGet, path, nil)); err != nil {
			t.Fatal(err)
		}
	}
	logs := buf.String()
	if strings.Contains(logs, secret) {
		t.Errorf("token leaked into log: %s", logs)
	}
	if !strings.Contains(logs, `"path":"/api/v1/invites/:code"`) || !strings.Contains(logs, `"path":"/api/v1/nope"`) {
		t.Errorf("unexpected paths in log: %s", logs)
	}
}
