package integration

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
)

// post ส่ง action ที่ต้องมี Idempotency-Key (key ใหม่ทุกครั้งถ้าไม่ระบุ)
func (c *client) post(path, body string, key ...string) (*http.Response, map[string]any) {
	c.t.Helper()
	k := uuid.NewString()
	if len(key) > 0 {
		k = key[0]
	}
	return c.doWith(http.MethodPost, path, body, map[string]string{"Idempotency-Key": k})
}

func ledgerCount(t *testing.T, dealID, typ string) int {
	t.Helper()
	var n int
	q := `SELECT count(*) FROM ledger_events WHERE deal_id = $1`
	args := []any{dealID}
	if typ != "" {
		q += ` AND event_type = $2`
		args = append(args, typ)
	}
	if err := pool.QueryRow(context.Background(), q, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func str(m map[string]any, path ...string) string {
	var cur any = m
	for _, p := range path {
		cur = cur.(map[string]any)[p]
	}
	s, _ := cur.(string)
	return s
}

func num(m map[string]any, path ...string) float64 {
	var cur any = m
	for _, p := range path {
		cur = cur.(map[string]any)[p]
	}
	f, _ := cur.(float64)
	return f
}

func version(m map[string]any) int { return int(num(m, "version")) }

// resetDeal รีเซ็ต scenario แล้วคืน id ของดีลตัวอย่าง
func resetDeal(t *testing.T, c *client, scenario string) string {
	t.Helper()
	res, body := c.do(http.MethodPost, "/demo/reset?scenario="+scenario, "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("reset: %d %v", res.StatusCode, body)
	}
	return str(body, "dealId")
}

func newDealBody(t *testing.T, landlord *client, total, booking int) string {
	t.Helper()
	_, props := landlord.do(http.MethodGet, "/properties", "")
	propID := props["items"].([]any)[0].(map[string]any)["id"].(string)
	bkk, _ := time.LoadLocation("Asia/Bangkok")
	viewing := time.Now().In(bkk).AddDate(0, 0, 3)
	viewing = time.Date(viewing.Year(), viewing.Month(), viewing.Day(), 14, 0, 0, 0, bkk)
	moveIn := viewing.AddDate(0, 0, 10).Format("2006-01-02")
	return fmt.Sprintf(`{"propertyId":%q,"totalSatang":%d,"bookingFeeSatang":%d,"viewingAt":%q,"moveInDate":%q}`,
		propID, total, booking, viewing.Format(time.RFC3339), moveIn)
}

// flow สำเร็จเต็ม: create → send → lock → confirm-viewing → confirm-move-in (docs/06-roadmap.md Phase 6)
func TestFullDealFlow(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	resetDeal(t, landlord, "fresh")

	res, deal := landlord.post("/deals", newDealBody(t, landlord, 650_000, 100_000))
	if res.StatusCode != http.StatusCreated || str(deal, "state") != "WAITING_ACCEPT" || version(deal) != 1 {
		t.Fatalf("create: %d %v", res.StatusCode, deal)
	}
	id := str(deal, "id")
	if !regexp.MustCompile(`^KS-\d{6}-\d{4}$`).MatchString(str(deal, "refNo")) {
		t.Errorf("refNo = %s", str(deal, "refNo"))
	}
	if num(deal, "amounts", "mainDepositSatang") != 550_000 {
		t.Errorf("mainDeposit = %v", num(deal, "amounts", "mainDepositSatang"))
	}
	qrURL := str(deal, "invite", "qrUrl")
	if !strings.HasPrefix(qrURL, "http://app.test/invites/") {
		t.Fatalf("qrUrl = %q", qrURL)
	}
	// qrUrl ไม่ถูกส่งซ้ำเมื่ออ่านดีลอีกครั้ง (token ไม่ได้เก็บ)
	if _, again := landlord.do(http.MethodGet, "/deals/"+id, ""); str(again, "invite", "qrUrl") != "" {
		t.Error("qrUrl leaked on GET")
	}

	res, sent := landlord.post("/deals/"+id+"/invite/send", `{"channel":"IN_APP"}`)
	if res.StatusCode != http.StatusOK || str(sent, "sentTo", "shortName") != "ณัฐธิดา ศ." {
		t.Fatalf("send: %d %v", res.StatusCode, sent)
	}
	_, home := tenant.do(http.MethodGet, "/home", "")
	if len(home["pendingInvites"].([]any)) != 1 {
		t.Fatalf("tenant home = %v", home)
	}

	// เปิดได้ทั้งจาก share code และ token ใน QR — ยังไม่เห็นข้อมูลผู้เช่า
	token := strings.TrimPrefix(qrURL, "http://app.test/invites/")
	for _, code := range []string{str(deal, "shareCode"), token} {
		res, preview := tenant.do(http.MethodGet, "/invites/"+code, "")
		if res.StatusCode != http.StatusOK || preview["tenant"] != nil || str(preview, "myRole") != "TENANT" {
			t.Fatalf("preview %s: %d %v", code, res.StatusCode, preview)
		}
	}

	res, locked := tenant.post("/deals/"+id+"/lock",
		fmt.Sprintf(`{"version":1,"inviteCode":%q,"method":"FACE_ID"}`, str(deal, "shareCode")))
	if res.StatusCode != http.StatusOK || str(locked, "state") != "FUNDS_LOCKED" || num(locked, "account", "availableSatang") != 2_200_000 {
		t.Fatalf("lock: %d %v", res.StatusCode, locked)
	}

	_, ll := landlord.do(http.MethodGet, "/deals/"+id, "")
	if str(ll, "state") != "FUNDS_LOCKED" || str(ll, "tenant", "shortName") != "ณัฐธิดา ศ." || num(ll, "amounts", "heldSatang") != 650_000 {
		t.Fatalf("landlord view: %v", ll)
	}

	res, viewed := tenant.post("/deals/"+id+"/confirm-viewing",
		fmt.Sprintf(`{"version":%d,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`, version(locked)))
	if res.StatusCode != http.StatusOK || str(viewed, "state") != "BOOKING_FEE_RELEASED" {
		t.Fatalf("confirm-viewing: %d %v", res.StatusCode, viewed)
	}

	res, done := tenant.post("/deals/"+id+"/confirm-move-in",
		fmt.Sprintf(`{"version":%d,"checklist":["GOT_KEYS","ROOM_USABLE","CONTRACT_SIGNED"]}`, version(viewed)))
	if res.StatusCode != http.StatusOK || str(done, "state") != "RELEASED" || version(done) != 4 {
		t.Fatalf("confirm-move-in: %d %v", res.StatusCode, done)
	}
	if num(done, "amounts", "releasedSatang") != 650_000 || num(done, "amounts", "heldSatang") != 0 || done["nextActor"] != nil {
		t.Errorf("final amounts: %v", done["amounts"])
	}

	// ยอดสุดท้าย: ผู้ให้เช่า 49,350.00 / ผู้เช่า 22,000.00
	if bal, _, _ := account(t, landlord); bal != 4_935_000 {
		t.Errorf("landlord balance = %v", bal)
	}
	if bal, held, avl := account(t, tenant); bal != 2_200_000 || held != 0 || avl != 2_200_000 {
		t.Errorf("tenant = %v/%v/%v", bal, held, avl)
	}
	if n := ledgerCount(t, id, ""); n != 3 {
		t.Errorf("ledger rows = %d, want 3 (HOLD, RELEASE_BOOKING_FEE, RELEASE_MAIN_DEPOSIT)", n)
	}

	var types []string
	for _, e := range done["timeline"].([]any) {
		types = append(types, e.(map[string]any)["type"].(string))
	}
	want := "DEAL_CREATED INVITE_SENT DEAL_ACCEPTED FUNDS_LOCKED VIEWING_CONFIRMED BOOKING_FEE_RELEASED MOVE_IN_CONFIRMED MAIN_DEPOSIT_RELEASED"
	if strings.Join(types, " ") != want {
		t.Errorf("timeline = %v", types)
	}
}

// ยิง confirm-viewing ซ้ำ 5 ครั้ง key เดียวกัน → ledger มี RELEASE_BOOKING_FEE 1 แถว
func TestConfirmViewingIsIdempotent(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "funds_locked")
	body := `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`
	key := uuid.NewString()

	var first string
	for i := range 5 {
		res, out := tenant.post("/deals/"+id+"/confirm-viewing", body, key)
		if res.StatusCode != http.StatusOK || str(out, "state") != "BOOKING_FEE_RELEASED" {
			t.Fatalf("attempt %d: %d %v", i+1, res.StatusCode, out)
		}
		replayed := res.Header.Get("Idempotent-Replayed") == "true"
		if (i == 0) == replayed {
			t.Errorf("attempt %d: replayed = %v", i+1, replayed)
		}
		if i == 0 {
			first = fmt.Sprint(out)
		} else if fmt.Sprint(out) != first {
			t.Errorf("attempt %d returned a different body", i+1)
		}
	}
	if n := ledgerCount(t, id, "RELEASE_BOOKING_FEE"); n != 1 {
		t.Errorf("RELEASE_BOOKING_FEE rows = %d, want 1", n)
	}
	if bal, _, _ := account(t, landlord); bal != 4_385_000 {
		t.Errorf("landlord paid more than once: %v", bal)
	}

	// key เดิม body ต่าง → IDEMPOTENCY_CONFLICT
	res, out := tenant.post("/deals/"+id+"/confirm-viewing", `{"version":3,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`, key)
	if res.StatusCode != http.StatusConflict || errorCode(out) != "IDEMPOTENCY_CONFLICT" {
		t.Errorf("same key, new body: %d %v", res.StatusCode, out)
	}
	// key ใหม่หลังปล่อยแล้ว → DEAL_STATE_CONFLICT (ไม่ใช่ VERSION_MISMATCH)
	res, out = tenant.post("/deals/"+id+"/confirm-viewing", body)
	if res.StatusCode != http.StatusConflict || errorCode(out) != "DEAL_STATE_CONFLICT" {
		t.Errorf("new key after release: %d %v", res.StatusCode, out)
	}
}

// ยิง confirm-viewing 2 request พร้อมกัน (key ต่างกัน) → สำเร็จ 1, 409 1
func TestConcurrentConfirmViewing(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	for round := range 5 { // หลายรอบ เพิ่มโอกาสชนกันจริง
		id := resetDeal(t, landlord, "funds_locked")
		body := `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`

		var wg sync.WaitGroup
		codes := make([]int, 2)
		start := make(chan struct{})
		for i := range 2 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-start
				res, _ := tenant.post("/deals/"+id+"/confirm-viewing", body)
				codes[i] = res.StatusCode
			}()
		}
		close(start)
		wg.Wait()

		ok, conflict := 0, 0
		for _, c := range codes {
			switch c {
			case http.StatusOK:
				ok++
			case http.StatusConflict:
				conflict++
			}
		}
		if ok != 1 || conflict != 1 {
			t.Fatalf("round %d: statuses %v, want one 200 and one 409", round, codes)
		}
		if n := ledgerCount(t, id, "RELEASE_BOOKING_FEE"); n != 1 {
			t.Fatalf("round %d: RELEASE_BOOKING_FEE rows = %d", round, n)
		}
	}
}

// landlord เรียก confirm → 403 · ผู้ใช้อื่นอ่าน/ทำรายการดีล → 403
func TestDealGuards(t *testing.T) {
	landlord, outsider := login(t, "landlord"), login(t, "outsider")
	id := resetDeal(t, landlord, "funds_locked")
	body := `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`

	res, out := landlord.post("/deals/"+id+"/confirm-viewing", body)
	if res.StatusCode != http.StatusForbidden || errorCode(out) != "FORBIDDEN_ROLE" {
		t.Errorf("landlord confirm: %d %v", res.StatusCode, out)
	}
	res, out = outsider.do(http.MethodGet, "/deals/"+id, "")
	if res.StatusCode != http.StatusForbidden || errorCode(out) != "NOT_DEAL_PARTY" {
		t.Errorf("outsider read: %d %v", res.StatusCode, out)
	}
	res, out = outsider.post("/deals/"+id+"/confirm-viewing", body)
	if res.StatusCode != http.StatusForbidden || errorCode(out) != "NOT_DEAL_PARTY" {
		t.Errorf("outsider confirm: %d %v", res.StatusCode, out)
	}
	res, out = landlord.do(http.MethodGet, "/deals/"+uuid.NewString(), "")
	if res.StatusCode != http.StatusNotFound {
		t.Errorf("unknown deal: %d %v", res.StatusCode, out)
	}
	if ledgerCount(t, id, "RELEASE_BOOKING_FEE") != 0 {
		t.Error("guarded request wrote ledger")
	}
}

// ยอดไม่พอ → 422 และไม่มี ledger event
func TestLockWithInsufficientBalance(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "waiting_accept")
	if _, err := pool.Exec(context.Background(),
		`UPDATE demo_accounts SET balance_satang = 500000 WHERE id = '00000000-0000-0000-0000-0000000bb001'`); err != nil {
		t.Fatal(err)
	}

	res, out := tenant.post("/deals/"+id+"/lock", `{"version":1,"inviteCode":"KS-8F4Q21","method":"FACE_ID"}`)
	if res.StatusCode != http.StatusUnprocessableEntity || errorCode(out) != "INSUFFICIENT_BALANCE" {
		t.Fatalf("lock: %d %v", res.StatusCode, out)
	}
	if n := ledgerCount(t, id, ""); n != 0 {
		t.Errorf("ledger rows = %d, want 0", n)
	}
	if _, held, _ := account(t, tenant); held != 0 {
		t.Errorf("held = %v", held)
	}
	if _, d := landlord.do(http.MethodGet, "/deals/"+id, ""); str(d, "state") != "WAITING_ACCEPT" || version(d) != 1 {
		t.Errorf("deal changed: %v", d)
	}
}

func TestActionValidation(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "funds_locked")
	full := `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`

	cases := []struct {
		name   string
		c      *client
		path   string
		body   string
		noKey  bool
		status int
		code   string
	}{
		{"no idempotency key", tenant, "/deals/" + id + "/confirm-viewing", full, true, 400, "IDEMPOTENCY_KEY_REQUIRED"},
		{"stale version", tenant, "/deals/" + id + "/confirm-viewing", `{"version":1,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`, false, 409, "VERSION_MISMATCH"},
		{"checklist incomplete", tenant, "/deals/" + id + "/confirm-viewing", `{"version":2,"checklist":["VIEWED_ROOM"]}`, false, 400, "VALIDATION_FAILED"},
		{"wrong step", tenant, "/deals/" + id + "/confirm-move-in", `{"version":2,"checklist":["GOT_KEYS","ROOM_USABLE","CONTRACT_SIGNED"]}`, false, 409, "DEAL_STATE_CONFLICT"},
		{"tenant cannot create", tenant, "/deals", `{}`, false, 403, "FORBIDDEN_ROLE"},
		{"booking >= total", landlord, "/deals", newDealBody(t, landlord, 100_000, 100_000), false, 400, "VALIDATION_FAILED"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var res *http.Response
			var out map[string]any
			if tc.noKey {
				res, out = tc.c.do(http.MethodPost, tc.path, tc.body)
			} else {
				res, out = tc.c.post(tc.path, tc.body)
			}
			if res.StatusCode != tc.status || errorCode(out) != tc.code {
				t.Errorf("got %d %v, want %d %s", res.StatusCode, out, tc.status, tc.code)
			}
		})
	}
	if ledgerCount(t, id, "RELEASE_BOOKING_FEE") != 0 {
		t.Error("rejected request wrote ledger")
	}
}

func TestRejectDeal(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "waiting_accept")

	res, out := tenant.post("/deals/"+id+"/reject", `{"version":1}`)
	if res.StatusCode != http.StatusOK || str(out, "state") != "REJECTED" || len(out["allowedActions"].([]any)) != 0 {
		t.Fatalf("reject: %d %v", res.StatusCode, out)
	}
	_, home := tenant.do(http.MethodGet, "/home", "")
	if len(home["pendingInvites"].([]any)) != 0 {
		t.Errorf("invite still pending: %v", home["pendingInvites"])
	}
	// ปฏิเสธแล้ว เปิดรหัสเดิมได้ผลลัพธ์ของตัวเอง (ผู้เช่าผูกกับดีลแล้ว) — คนอื่นได้ 404
	if res, _ := login(t, "outsider").do(http.MethodGet, "/invites/KS-8F4Q21", ""); res.StatusCode != http.StatusNotFound {
		t.Errorf("outsider preview after reject: %d", res.StatusCode)
	}
}

func TestReissueInviteRevokesOldQR(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	resetDeal(t, landlord, "fresh")
	_, deal := landlord.post("/deals", newDealBody(t, landlord, 650_000, 100_000))
	id := str(deal, "id")
	oldToken := strings.TrimPrefix(str(deal, "invite", "qrUrl"), "http://app.test/invites/")

	res, again := landlord.post("/deals/"+id+"/invite", "")
	newToken := strings.TrimPrefix(str(again, "invite", "qrUrl"), "http://app.test/invites/")
	if res.StatusCode != http.StatusOK || newToken == "" || newToken == oldToken {
		t.Fatalf("reissue: %d %v", res.StatusCode, again)
	}
	if res, out := tenant.do(http.MethodGet, "/invites/"+oldToken, ""); res.StatusCode != http.StatusGone || errorCode(out) != "INVITE_EXPIRED" {
		t.Errorf("old token: %d %v", res.StatusCode, out)
	}
	if res, _ := tenant.do(http.MethodGet, "/invites/"+newToken, ""); res.StatusCode != http.StatusOK {
		t.Errorf("new token: %d", res.StatusCode)
	}
	if res, _ := tenant.do(http.MethodGet, "/invites/KS-ZZZZZZ", ""); res.StatusCode != http.StatusNotFound {
		t.Errorf("unknown code: %d", res.StatusCode)
	}
}

func TestLookupTenantByPhone(t *testing.T) {
	landlord := login(t, "landlord")
	res, out := landlord.do(http.MethodGet, "/users/lookup?phone=089-000-1432", "")
	if res.StatusCode != http.StatusOK || str(out, "shortName") != "ณัฐธิดา ศ." || len(out) != 1 {
		t.Errorf("lookup: %d %v", res.StatusCode, out)
	}
	// เบอร์ของผู้ให้เช่า (ไม่ใช่ผู้เช่า) → ไม่พบ
	if res, _ := landlord.do(http.MethodGet, "/users/lookup?phone=0810004821", ""); res.StatusCode != http.StatusNotFound {
		t.Errorf("landlord phone: %d", res.StatusCode)
	}
}

func TestInvitePreviewRateLimited(t *testing.T) {
	outsider := login(t, "outsider")
	var last int
	for range 31 {
		res, _ := outsider.do(http.MethodGet, "/invites/KS-ZZZZZZ", "")
		last = res.StatusCode
	}
	if last != http.StatusTooManyRequests {
		t.Errorf("31st request: %d, want 429", last)
	}
}

// กดรัวด้วย key เดียวกันพร้อมกัน (เน็ตช้า retry ซ้อน) → ทุกตัวได้คำตอบเดียวกัน ปล่อยเงินครั้งเดียว
func TestConcurrentSameKey(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "funds_locked")
	body := `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`
	key := uuid.NewString()

	var wg sync.WaitGroup
	codes := make([]int, 5)
	start := make(chan struct{})
	for i := range codes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			res, _ := tenant.post("/deals/"+id+"/confirm-viewing", body, key)
			codes[i] = res.StatusCode
		}()
	}
	close(start)
	wg.Wait()
	for i, c := range codes {
		if c != http.StatusOK {
			t.Errorf("request %d: %d", i, c)
		}
	}
	if n := ledgerCount(t, id, "RELEASE_BOOKING_FEE"); n != 1 {
		t.Errorf("RELEASE_BOOKING_FEE rows = %d", n)
	}
}
