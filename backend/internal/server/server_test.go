package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type fakeDB struct{ err error }

func (f fakeDB) Ping(context.Context) error { return f.err }

func newTestApp(db fakeDB) *fiber.App {
	return New(Deps{Log: slog.New(slog.NewJSONHandler(io.Discard, nil)), DB: db})
}

type errorResponse struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"requestId"`
	} `json:"error"`
}

func do(t *testing.T, app *fiber.App, req *http.Request) (*http.Response, []byte) {
	t.Helper()
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	body, _ := io.ReadAll(res.Body)
	_ = res.Body.Close()
	return res, body
}

func TestHealthz(t *testing.T) {
	res, body := do(t, newTestApp(fakeDB{err: errors.New("down")}), httptest.NewRequest(http.MethodGet, "/api/v1/healthz", nil))
	if res.StatusCode != http.StatusOK || string(body) != `{"status":"ok"}` {
		t.Fatalf("got %d %s", res.StatusCode, body)
	}
}

func TestReadyz(t *testing.T) {
	res, body := do(t, newTestApp(fakeDB{}), httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil))
	if res.StatusCode != http.StatusOK || string(body) != `{"status":"ready"}` {
		t.Fatalf("got %d %s", res.StatusCode, body)
	}
}

func TestReadyzWhenDatabaseDown(t *testing.T) {
	res, body := do(t, newTestApp(fakeDB{err: errors.New("connection refused")}), httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil))
	if res.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", res.StatusCode)
	}
	var e errorResponse
	if err := json.Unmarshal(body, &e); err != nil {
		t.Fatal(err)
	}
	if e.Error.Code != "NOT_READY" || e.Error.RequestID == "" {
		t.Errorf("body = %s", body)
	}
	if strings.Contains(string(body), "connection refused") {
		t.Errorf("internal error leaked: %s", body)
	}
}

func TestUnknownRouteUsesErrorFormat(t *testing.T) {
	res, body := do(t, newTestApp(fakeDB{}), httptest.NewRequest(http.MethodGet, "/api/v1/nope", nil))
	var e errorResponse
	if err := json.Unmarshal(body, &e); err != nil {
		t.Fatalf("not JSON: %s", body)
	}
	if res.StatusCode != http.StatusNotFound || e.Error.Code != "NOT_FOUND" {
		t.Errorf("got %d %s", res.StatusCode, body)
	}
}

func TestRequestIDIsEchoed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/nope", nil)
	req.Header.Set("X-Request-ID", "req-abc-123")
	res, body := do(t, newTestApp(fakeDB{}), req)
	if got := res.Header.Get("X-Request-ID"); got != "req-abc-123" {
		t.Errorf("header X-Request-ID = %q", got)
	}
	var e errorResponse
	_ = json.Unmarshal(body, &e)
	if e.Error.RequestID != "req-abc-123" {
		t.Errorf("body requestId = %q", e.Error.RequestID)
	}
}

func TestPanicBecomesInternalError(t *testing.T) {
	app := newTestApp(fakeDB{})
	app.Get("/boom", func(fiber.Ctx) error { panic("secret detail") })

	res, body := do(t, app, httptest.NewRequest(http.MethodGet, "/boom", nil))
	var e errorResponse
	_ = json.Unmarshal(body, &e)
	if res.StatusCode != http.StatusInternalServerError || e.Error.Code != "INTERNAL" {
		t.Errorf("got %d %s", res.StatusCode, body)
	}
	if strings.Contains(string(body), "secret detail") {
		t.Errorf("panic detail leaked: %s", body)
	}
}
