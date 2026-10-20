package integration

import (
	"context"
	"net/http"
	"strconv"
	"testing"
	"time"
)

// startSandbox opens a private sandbox like the /play page does; the client is its tenant.
func startSandbox(t *testing.T, scenario string) (*client, map[string]any) {
	t.Helper()
	c := &client{t: t}
	res, out := c.do(http.MethodPost, "/demo/sandbox?scenario="+scenario, "")
	if res.StatusCode != http.StatusCreated || str(out, "sandboxId") == "" {
		t.Fatalf("start sandbox: %d %v", res.StatusCode, out)
	}
	return c, out
}

// switchRole signs in as the other persona while keeping the current cookie, like the demo menu.
func (c *client) switchRole(username string) {
	c.t.Helper()
	if res, body := c.do(http.MethodPost, "/auth/demo-login", `{"username":"`+username+`"}`); res.StatusCode != http.StatusOK {
		c.t.Fatalf("switch to %s: %d %v", username, res.StatusCode, body)
	}
}

func meOf(t *testing.T, c *client) map[string]any {
	t.Helper()
	res, me := c.do(http.MethodGet, "/me", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("me: %d %v", res.StatusCode, me)
	}
	return me
}

func TestSandboxFullFlow(t *testing.T) {
	tenant, sb := startSandbox(t, "waiting_accept")
	id, code := str(sb, "dealId"), str(sb, "shareCode")
	if code == "KS-8F4Q21" || code == "" {
		t.Fatalf("sandbox share code = %q", code)
	}
	me := meOf(t, tenant)
	if str(me, "user", "role") != "TENANT" || me["user"].(map[string]any)["sandbox"] != true {
		t.Fatalf("sandbox me = %v", me)
	}
	if res, preview := tenant.do(http.MethodGet, "/invites/"+code, ""); res.StatusCode != http.StatusOK || str(preview, "id") != id {
		t.Fatalf("preview: %d %v", res.StatusCode, preview)
	}

	res, deal := tenant.post("/deals/"+id+"/lock", `{"version":1,"inviteCode":"`+code+`","method":"FACE_ID"}`)
	if res.StatusCode != http.StatusOK || str(deal, "state") != "FUNDS_LOCKED" {
		t.Fatalf("lock: %d %v", res.StatusCode, deal)
	}
	res, deal = tenant.post("/deals/"+id+"/confirm-viewing",
		`{"version":`+itoa(version(deal))+`,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`)
	if res.StatusCode != http.StatusOK || str(deal, "state") != "BOOKING_FEE_RELEASED" {
		t.Fatalf("confirm viewing: %d %v", res.StatusCode, deal)
	}
	res, deal = tenant.post("/deals/"+id+"/confirm-move-in",
		`{"version":`+itoa(version(deal))+`,"checklist":["GOT_KEYS","ROOM_USABLE","CONTRACT_SIGNED"]}`)
	if res.StatusCode != http.StatusOK || str(deal, "state") != "RELEASED" {
		t.Fatalf("confirm move-in: %d %v", res.StatusCode, deal)
	}

	tenant.switchRole("landlord")
	me = meOf(t, tenant)
	if str(me, "user", "role") != "LANDLORD" || me["user"].(map[string]any)["sandbox"] != true {
		t.Fatalf("switched me = %v", me)
	}
	if bal := num(me, "account", "balanceSatang"); bal != 4_285_000+650_000 {
		t.Errorf("sandbox landlord balance = %v", bal)
	}
	if _, landlordDeal := tenant.do(http.MethodGet, "/deals/"+id, ""); str(landlordDeal, "myRole") != "LANDLORD" {
		t.Errorf("landlord view = %v", landlordDeal)
	}
	// The landlord can start a new deal in the sandbox and invite the sandbox tenant by the demo phone.
	res, created := tenant.post("/deals", newDealBody(t, tenant, 500_000, 50_000))
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create in sandbox: %d %v", res.StatusCode, created)
	}
	res, sent := tenant.post("/deals/"+str(created, "id")+"/invite/send", `{"channel":"PHONE","phone":"089-000-1432"}`)
	if res.StatusCode != http.StatusOK || str(sent, "sentTo", "shortName") != "ณัฐธิดา ศ." {
		t.Fatalf("send by phone: %d %v", res.StatusCode, sent)
	}
	tenant.switchRole("tenant")
	if _, home := tenant.do(http.MethodGet, "/home", ""); len(home["pendingInvites"].([]any)) != 1 {
		t.Errorf("sandbox tenant did not get the invite: %v", home)
	}
}

func TestSandboxIsolation(t *testing.T) {
	a, sbA := startSandbox(t, "waiting_accept")
	b, _ := startSandbox(t, "funds_locked")
	idA, codeA := str(sbA, "dealId"), str(sbA, "shareCode")

	a.switchRole("landlord")
	landlordAccA := str(meOf(t, a), "account", "id")
	a.switchRole("tenant")

	shared := login(t, "tenant")
	for name, c := range map[string]*client{"other sandbox": b, "shared account": shared} {
		t.Run(name, func(t *testing.T) {
			c.t = t
			checks := []struct {
				what string
				res  *http.Response
			}{
				{"get", first(c.do(http.MethodGet, "/deals/"+idA, ""))},
				{"calendar", first(c.do(http.MethodGet, "/deals/"+idA+"/calendar.ics", ""))},
				{"preview", first(c.do(http.MethodGet, "/invites/"+codeA, ""))},
				{"lock", first(c.post("/deals/"+idA+"/lock", `{"version":1,"inviteCode":"`+codeA+`","method":"FACE_ID"}`))},
				{"reject", first(c.post("/deals/"+idA+"/reject", `{"version":1}`))},
				{"cancel", first(c.post("/deals/"+idA+"/cancel", `{"version":1}`))},
				{"report", first(c.post("/deals/"+idA+"/report-issue", `{"version":1}`))},
				{"expire", first(c.do(http.MethodPost, "/demo/deals/"+idA+"/expire-now", ""))},
				{"precheck", first(c.do(http.MethodPost, "/transfers/precheck", `{"toAccountId":"`+landlordAccA+`","amountSatang":100}`))},
				{"transfer", first(c.post("/transfers", `{"toAccountId":"`+landlordAccA+`","amountSatang":100,"memo":"","action":"CONFIRM"}`))},
			}
			for _, ch := range checks {
				if ch.res.StatusCode != http.StatusNotFound && ch.res.StatusCode != http.StatusForbidden {
					t.Errorf("%s on another sandbox's deal: %d, want 404/403", ch.what, ch.res.StatusCode)
				}
			}
			_, payees := c.do(http.MethodGet, "/transfers/payees", "")
			for _, p := range payees["items"].([]any) {
				if p.(map[string]any)["accountId"] == landlordAccA {
					t.Error("payees list another sandbox's account")
				}
			}
		})
	}

	// Sandbox A is untouched.
	_, deal := a.do(http.MethodGet, "/deals/"+idA, "")
	if str(deal, "state") != "WAITING_ACCEPT" || version(deal) != 1 {
		t.Errorf("sandbox A deal changed: %v", deal)
	}
	if bal := num(meOf(t, a), "account", "balanceSatang"); bal != 2_850_000 {
		t.Errorf("sandbox A tenant balance = %v", bal)
	}
}

func TestSandboxResetIsScoped(t *testing.T) {
	landlord := login(t, "landlord")
	sharedDeal := resetDeal(t, landlord, "funds_locked")
	a, _ := startSandbox(t, "booking_released")
	if body := first2(a.do(http.MethodPost, "/demo/reset?scenario=released", "")); str(body, "dealId") == "" {
		t.Fatalf("sandbox reset: %v", body)
	}
	if _, d := landlord.do(http.MethodGet, "/deals/"+sharedDeal, ""); str(d, "state") != "FUNDS_LOCKED" {
		t.Errorf("shared deal after sandbox reset: %v", d)
	}
	_, home := a.do(http.MethodGet, "/home", "")
	resetDeal(t, landlord, "fresh")
	_, again := a.do(http.MethodGet, "/home", "")
	if len(again["activeDeals"].([]any)) != len(home["activeDeals"].([]any)) {
		t.Errorf("shared reset changed a sandbox: before %v after %v", home, again)
	}
	if bal := num(meOf(t, a), "account", "balanceSatang"); bal != 2_850_000-650_000 {
		t.Errorf("sandbox tenant balance after shared reset = %v", bal)
	}
}

func TestSharedLoginIgnoresSandboxes(t *testing.T) {
	startSandbox(t, "waiting_accept")
	me := meOf(t, login(t, "tenant"))
	if str(me, "user", "id") != "00000000-0000-0000-0000-00000000b001" {
		t.Errorf("shared tenant login landed on %v", me)
	}
	if _, ok := me["user"].(map[string]any)["sandbox"]; ok {
		t.Error("shared /me should not include the sandbox field")
	}
}

func TestSandboxJanitor(t *testing.T) {
	a, _ := startSandbox(t, "released") // Has ledger rows, which only a purge may delete.
	if _, err := pool.Exec(context.Background(), "DELETE FROM ledger_events WHERE id = (SELECT min(id) FROM ledger_events)"); err == nil {
		t.Fatal("ledger rows were deletable without the purge flag")
	}
	if n, err := demo.CleanupSandboxes(context.Background(), time.Hour); err != nil || n != 0 {
		t.Fatalf("fresh sandboxes must survive: removed %d, %v", n, err)
	}
	n, err := demo.CleanupSandboxes(context.Background(), -time.Hour) // Everything counts as idle.
	if err != nil || n == 0 {
		t.Fatalf("cleanup: removed %d, %v", n, err)
	}
	if res, _ := a.do(http.MethodGet, "/me", ""); res.StatusCode != http.StatusUnauthorized {
		t.Errorf("removed sandbox /me = %d, want 401", res.StatusCode)
	}
	var left int
	if err := pool.QueryRow(context.Background(), "SELECT count(*) FROM users WHERE sandbox_id IS NOT NULL").Scan(&left); err != nil || left != 0 {
		t.Errorf("sandbox users left = %d, %v", left, err)
	}
	// The shared demo still works.
	resetDeal(t, login(t, "landlord"), "funds_locked")
}

func first(res *http.Response, _ map[string]any) *http.Response   { return res }
func first2(_ *http.Response, body map[string]any) map[string]any { return body }

func itoa(n int) string { return strconv.Itoa(n) }
