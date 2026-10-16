// Integration test: ยิง HTTP เข้า app จริงที่ต่อ Postgres จริง
// ต้องตั้ง TEST_DATABASE_URL (make test ตั้งให้ และสร้าง DB ksure_test ให้) — ไม่ตั้ง = ข้าม
package integration

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/database"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/session"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/server"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
	"github.com/suphanatchanlek30/ksure/backend/migrations"
)

var app *fiber.App

func TestMain(m *testing.M) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		os.Exit(0) // ไม่มี DB ให้ทดสอบ — go test ./... ธรรมดายังผ่าน
	}
	ctx := context.Background()
	log := slog.New(slog.NewJSONHandler(io.Discard, nil))

	pool, err := database.Connect(ctx, url)
	if err != nil {
		slog.Error("connect test db", "error", err)
		os.Exit(1)
	}
	if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
		slog.Error("migrate test db", "error", err)
		os.Exit(1)
	}

	bkk, _ := time.LoadLocation("Asia/Bangkok")
	clk := clock.System{}
	repo := repository.New(pool)
	app = server.New(server.Deps{
		Log:           log,
		DB:            pool,
		Sessions:      session.NewManager("integration-test-secret-0123456789abcdef", time.Hour, clk),
		Users:         service.NewUserService(repo, clk, bkk),
		Notifications: service.NewNotificationService(repo, clk, bkk),
		Demo:          service.NewDemoService(repo, clk, bkk, 24*time.Hour),
	})

	code := m.Run()
	pool.Close()
	os.Exit(code)
}

// client จำ cookie เหมือน browser หนึ่งตัว
type client struct {
	t      *testing.T
	cookie *http.Cookie
}

func (c *client) do(method, path, body string) (*http.Response, map[string]any) {
	c.t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, r)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.cookie != nil {
		req.AddCookie(c.cookie)
	}
	res, err := app.Test(req, fiber.TestConfig{Timeout: 5 * time.Second})
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	for _, ck := range res.Cookies() {
		if ck.Name == session.CookieName {
			c.cookie = ck
		}
	}
	raw, _ := io.ReadAll(res.Body)
	var out map[string]any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &out); err != nil {
			c.t.Fatalf("%s %s: not JSON: %s", method, path, raw)
		}
	}
	return res, out
}

func login(t *testing.T, username string) *client {
	t.Helper()
	c := &client{t: t}
	res, body := c.do(http.MethodPost, "/auth/demo-login", `{"username":"`+username+`"}`)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("login %s: %d %v", username, res.StatusCode, body)
	}
	return c
}

func reset(t *testing.T, c *client, scenario string) {
	t.Helper()
	res, body := c.do(http.MethodPost, "/demo/reset?scenario="+scenario, "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("reset %s: %d %v", scenario, res.StatusCode, body)
	}
}

func errorCode(body map[string]any) string {
	e, _ := body["error"].(map[string]any)
	code, _ := e["code"].(string)
	return code
}

func account(t *testing.T, c *client) (balance, held, available float64) {
	t.Helper()
	_, me := c.do(http.MethodGet, "/me", "")
	acc := me["account"].(map[string]any)
	return acc["balanceSatang"].(float64), acc["heldSatang"].(float64), acc["availableSatang"].(float64)
}

func TestLoginSetsHttpOnlyCookie(t *testing.T) {
	c := login(t, "tenant")
	if !c.cookie.HttpOnly || c.cookie.SameSite != http.SameSiteLaxMode || c.cookie.Path != "/" {
		t.Errorf("cookie flags: %+v", c.cookie)
	}
	_, me := c.do(http.MethodGet, "/me", "")
	if me["user"].(map[string]any)["role"] != "TENANT" {
		t.Errorf("me = %v", me)
	}
}

func TestUnknownUserCannotLogin(t *testing.T) {
	c := &client{t: t}
	res, body := c.do(http.MethodPost, "/auth/demo-login", `{"username":"mallory"}`)
	if res.StatusCode != http.StatusUnauthorized || errorCode(body) != "UNAUTHENTICATED" || c.cookie != nil {
		t.Errorf("got %d %v cookie=%v", res.StatusCode, body, c.cookie)
	}
}

func TestProtectedRoutesNeedLogin(t *testing.T) {
	anon := &client{t: t}
	for _, p := range []string{"/me", "/home", "/properties", "/notifications"} {
		res, body := anon.do(http.MethodGet, p, "")
		if res.StatusCode != http.StatusUnauthorized || errorCode(body) != "UNAUTHENTICATED" {
			t.Errorf("GET %s: %d %v", p, res.StatusCode, body)
		}
	}
	forged := &client{t: t, cookie: &http.Cookie{Name: session.CookieName, Value: "eyJhbGciOiJub25lIn0.e30."}}
	if res, _ := forged.do(http.MethodGet, "/me", ""); res.StatusCode != http.StatusUnauthorized {
		t.Errorf("forged cookie: %d", res.StatusCode)
	}
}

func TestLogoutClearsCookie(t *testing.T) {
	c := login(t, "landlord")
	res, _ := c.do(http.MethodPost, "/auth/logout", "")
	if res.StatusCode != http.StatusNoContent || c.cookie.Value != "" {
		t.Errorf("logout: %d cookie=%+v", res.StatusCode, c.cookie)
	}
}

func TestPropertiesIsLandlordOnly(t *testing.T) {
	res, body := login(t, "tenant").do(http.MethodGet, "/properties", "")
	if res.StatusCode != http.StatusForbidden || errorCode(body) != "FORBIDDEN_ROLE" {
		t.Errorf("tenant: %d %v", res.StatusCode, body)
	}
	res, body = login(t, "landlord").do(http.MethodGet, "/properties", "")
	items, _ := body["items"].([]any)
	if res.StatusCode != http.StatusOK || len(items) != 1 || items[0].(map[string]any)["unitNo"] != "A1203" {
		t.Errorf("landlord: %d %v", res.StatusCode, body)
	}
}

// ยอดเงินแต่ละ scenario ต้องตรงกับ ledger (docs/04-database.md §2, §5)
func TestDemoScenarioBalances(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	tests := []struct {
		scenario                         string
		tenantBal, tenantHeld, tenantAvl float64
		landlordBal                      float64
		landlordActive, tenantActive     int
		tenantInvites                    int
	}{
		{"fresh", 2_850_000, 0, 2_850_000, 4_285_000, 0, 0, 0},
		{"waiting_accept", 2_850_000, 0, 2_850_000, 4_285_000, 1, 0, 1},
		{"funds_locked", 2_850_000, 650_000, 2_200_000, 4_285_000, 1, 1, 0}, // T4 "ยอดที่ใช้ได้ตอนนี้ 22,000.00"
		{"booking_released", 2_750_000, 550_000, 2_200_000, 4_385_000, 1, 1, 0},
		{"released", 2_200_000, 0, 2_200_000, 4_935_000, 0, 0, 0}, // ผู้ให้เช่า 49,350.00 / ผู้เช่า 22,000.00
	}
	for _, tt := range tests {
		t.Run(tt.scenario, func(t *testing.T) {
			reset(t, landlord, tt.scenario)

			bal, held, avl := account(t, tenant)
			if bal != tt.tenantBal || held != tt.tenantHeld || avl != tt.tenantAvl {
				t.Errorf("tenant = %v/%v/%v, want %v/%v/%v", bal, held, avl, tt.tenantBal, tt.tenantHeld, tt.tenantAvl)
			}
			if bal, _, _ := account(t, landlord); bal != tt.landlordBal {
				t.Errorf("landlord balance = %v, want %v", bal, tt.landlordBal)
			}

			_, lh := landlord.do(http.MethodGet, "/home", "")
			_, th := tenant.do(http.MethodGet, "/home", "")
			if n := len(lh["activeDeals"].([]any)); n != tt.landlordActive {
				t.Errorf("landlord activeDeals = %d, want %d", n, tt.landlordActive)
			}
			if n := len(th["activeDeals"].([]any)); n != tt.tenantActive {
				t.Errorf("tenant activeDeals = %d, want %d", n, tt.tenantActive)
			}
			if n := len(th["pendingInvites"].([]any)); n != tt.tenantInvites {
				t.Errorf("tenant pendingInvites = %d, want %d", n, tt.tenantInvites)
			}
		})
	}
}

func TestPendingInviteMatchesMockup(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	reset(t, landlord, "waiting_accept")

	_, home := tenant.do(http.MethodGet, "/home", "")
	inv := home["pendingInvites"].([]any)[0].(map[string]any)
	if inv["shareCode"] != "KS-8F4Q21" || inv["fromShortName"] != "สมชาย ใ." || inv["totalSatang"] != float64(650_000) {
		t.Errorf("invite = %v", inv)
	}
	// เวลาเป็น ISO-8601 พร้อม offset ไทย
	if s, _ := inv["viewingAt"].(string); !strings.HasSuffix(s, "T14:00:00+07:00") {
		t.Errorf("viewingAt = %v", inv["viewingAt"])
	}
}

func TestNotificationsReadFlow(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	reset(t, landlord, "waiting_accept")

	_, list := tenant.do(http.MethodGet, "/notifications", "")
	items := list["items"].([]any)
	if list["unreadCount"] != float64(1) || len(items) != 1 {
		t.Fatalf("list = %v", list)
	}
	id := items[0].(map[string]any)["id"].(string)

	// อ่านของคนอื่นไม่ได้ — ผู้ให้เช่าส่ง id ของผู้เช่ามาก็ไม่มีผล
	landlord.do(http.MethodPost, "/notifications/read", `{"ids":["`+id+`"]}`)
	if _, me := tenant.do(http.MethodGet, "/me", ""); me["unreadNotifications"] != float64(1) {
		t.Errorf("landlord marked tenant's notification: %v", me)
	}

	res, out := tenant.do(http.MethodPost, "/notifications/read", `{"ids":["`+id+`"]}`)
	if res.StatusCode != http.StatusOK || out["unreadCount"] != float64(0) {
		t.Errorf("mark read: %d %v", res.StatusCode, out)
	}

	res, out = tenant.do(http.MethodPost, "/notifications/read", `{}`)
	if res.StatusCode != http.StatusBadRequest || errorCode(out) != "VALIDATION_FAILED" {
		t.Errorf("empty body: %d %v", res.StatusCode, out)
	}
}

func TestUnknownScenario(t *testing.T) {
	res, body := login(t, "landlord").do(http.MethodPost, "/demo/reset?scenario=nope", "")
	if res.StatusCode != http.StatusBadRequest || errorCode(body) != "VALIDATION_FAILED" {
		t.Errorf("got %d %v", res.StatusCode, body)
	}
}
