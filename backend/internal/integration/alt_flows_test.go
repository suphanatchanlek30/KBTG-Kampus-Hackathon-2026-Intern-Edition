package integration

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func actions(m map[string]any) string {
	var out []string
	for _, a := range m["allowedActions"].([]any) {
		out = append(out, a.(string))
	}
	return strings.Join(out, ",")
}

// ยกเลิกต้องยินยอมทั้งสองฝ่าย — ค่าจองที่ปล่อยแล้วไม่คืน (docs/04-database.md §6.4)
func TestCancelNeedsBothParties(t *testing.T) {
	cases := []struct {
		scenario               string
		version                int
		refund                 float64
		tenantBal, landlordBal float64
		firstBy, secondBy      string
	}{
		{"funds_locked", 2, 650_000, 2_850_000, 4_285_000, "landlord", "tenant"},
		{"booking_released", 3, 550_000, 2_750_000, 4_385_000, "tenant", "landlord"},
	}
	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			c := map[string]*client{"landlord": login(t, "landlord"), "tenant": login(t, "tenant")}
			id := resetDeal(t, c["landlord"], tc.scenario)

			res, first := c[tc.firstBy].post("/deals/"+id+"/cancel", fmt.Sprintf(`{"version":%d}`, tc.version))
			if res.StatusCode != http.StatusOK || str(first, "state") != strings.ToUpper(strings.Replace(tc.scenario, "booking_released", "booking_fee_released", 1)) {
				t.Fatalf("first cancel: %d %v", res.StatusCode, first)
			}
			if strings.Contains(actions(first), "CANCEL") {
				t.Errorf("requester can still cancel: %s", actions(first))
			}
			wantNext := strings.ToUpper(map[string]string{"landlord": "TENANT", "tenant": "LANDLORD"}[tc.firstBy])
			if str(first, "nextActor") != wantNext {
				t.Errorf("nextActor = %v, want %s", first["nextActor"], wantNext)
			}
			// ขอซ้ำ (key ใหม่) → conflict ไม่ใช่ยกเลิกเอง
			if res, out := c[tc.firstBy].post("/deals/"+id+"/cancel", fmt.Sprintf(`{"version":%d}`, tc.version+1)); res.StatusCode != http.StatusConflict {
				t.Errorf("repeat request: %d %v", res.StatusCode, out)
			}
			if ledgerCount(t, id, "REFUND") != 0 {
				t.Fatal("refunded after one party")
			}

			res, done := c[tc.secondBy].post("/deals/"+id+"/cancel", fmt.Sprintf(`{"version":%d}`, tc.version+1))
			if res.StatusCode != http.StatusOK || str(done, "state") != "REFUNDED" || done["nextActor"] != nil {
				t.Fatalf("second cancel: %d %v", res.StatusCode, done)
			}
			if num(done, "amounts", "refundedSatang") != tc.refund || num(done, "amounts", "heldSatang") != 0 {
				t.Errorf("amounts = %v", done["amounts"])
			}
			if bal, held, _ := account(t, c["tenant"]); bal != tc.tenantBal || held != 0 {
				t.Errorf("tenant = %v/%v", bal, held)
			}
			if bal, _, _ := account(t, c["landlord"]); bal != tc.landlordBal {
				t.Errorf("landlord = %v", bal)
			}
		})
	}
}

func TestCancelGuards(t *testing.T) {
	landlord, outsider := login(t, "landlord"), login(t, "outsider")
	id := resetDeal(t, landlord, "waiting_accept")
	if res, out := landlord.post("/deals/"+id+"/cancel", `{"version":1}`); res.StatusCode != http.StatusConflict {
		t.Errorf("cancel before lock: %d %v", res.StatusCode, out)
	}
	id = resetDeal(t, landlord, "funds_locked")
	if res, out := outsider.post("/deals/"+id+"/cancel", `{"version":2}`); res.StatusCode != http.StatusForbidden {
		t.Errorf("outsider cancel: %d %v", res.StatusCode, out)
	}
}

func TestReportIssue(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "funds_locked")
	res, out := tenant.post("/deals/"+id+"/report-issue", `{"version":2}`)
	if res.StatusCode != http.StatusOK || out["hasOpenIssue"] != true || strings.Contains(actions(out), "REPORT_ISSUE") {
		t.Fatalf("report: %d %v", res.StatusCode, out)
	}
	if str(out, "state") != "FUNDS_LOCKED" || num(out, "amounts", "heldSatang") != 650_000 {
		t.Errorf("money moved: %v", out)
	}
	if res, _ := tenant.post("/deals/"+id+"/report-issue", `{"version":3}`); res.StatusCode != http.StatusConflict {
		t.Errorf("second report: %d", res.StatusCode)
	}
	if res, _ := landlord.post("/deals/"+id+"/report-issue", `{"version":3}`); res.StatusCode != http.StatusForbidden {
		t.Errorf("landlord report: %d", res.StatusCode)
	}
}

func TestExpireNowRefunds(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	id := resetDeal(t, landlord, "booking_released")
	res, out := landlord.do(http.MethodPost, "/demo/deals/"+id+"/expire-now", "")
	if res.StatusCode != http.StatusOK || str(out, "state") != "REFUNDED" || num(out, "amounts", "refundedSatang") != 550_000 {
		t.Fatalf("expire-now: %d %v", res.StatusCode, out)
	}
	if bal, held, _ := account(t, tenant); bal != 2_750_000 || held != 0 {
		t.Errorf("tenant = %v/%v (booking fee stays released)", bal, held)
	}
	if res, _ := landlord.do(http.MethodPost, "/demo/deals/"+id+"/expire-now", ""); res.StatusCode != http.StatusConflict {
		t.Errorf("expire twice: %d", res.StatusCode)
	}
}

// คำเชิญหมดอายุ (ดีลยังไม่หมด) → worker เปลี่ยนเป็น EXPIRED ไม่มีเงินให้คืน
func TestWorkerExpiresStaleInvite(t *testing.T) {
	landlord := login(t, "landlord")
	id := resetDeal(t, landlord, "waiting_accept")
	if _, err := pool.Exec(context.Background(), `UPDATE deal_invites SET expires_at = now() - interval '1 minute' WHERE deal_id = $1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := deals.ExpireDue(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, d := landlord.do(http.MethodGet, "/deals/"+id, ""); str(d, "state") != "EXPIRED" || ledgerCount(t, id, "") != 0 {
		t.Errorf("deal = %v", d["state"])
	}
}

// expiry ชนกับ confirm พร้อมกัน → ได้ผลลัพธ์เดียว: ดีลเลยกำหนดแล้วจึงต้องคืนเงิน ไม่ปล่อยค่าจอง
func TestExpiryRacesConfirm(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	for round := range 5 {
		id := resetDeal(t, landlord, "funds_locked")
		if _, err := pool.Exec(context.Background(),
			`UPDATE deals SET viewing_at = now() - interval '2 days', move_in_date = current_date - 1, expires_at = now() - interval '1 second' WHERE id = $1`, id); err != nil {
			t.Fatal(err)
		}
		var wg sync.WaitGroup
		var status int
		start := make(chan struct{})
		wg.Add(2)
		go func() {
			defer wg.Done()
			<-start
			res, _ := tenant.post("/deals/"+id+"/confirm-viewing", `{"version":2,"checklist":["VIEWED_ROOM","ROOM_MATCHES","LANDLORD_MATCHES"]}`)
			status = res.StatusCode
		}()
		go func() {
			defer wg.Done()
			<-start
			_, _ = deals.ExpireDue(context.Background())
		}()
		close(start)
		wg.Wait()
		// worker อาจข้าม (SKIP LOCKED) ระหว่างที่ confirm ถือ lock — รอบถัดไปต้องจัดการ
		if _, err := deals.ExpireDue(context.Background()); err != nil {
			t.Fatal(err)
		}

		if status == http.StatusOK {
			t.Fatalf("round %d: confirm succeeded after expiry", round)
		}
		if ledgerCount(t, id, "RELEASE_BOOKING_FEE") != 0 || ledgerCount(t, id, "REFUND") != 1 {
			t.Fatalf("round %d: ledger release=%d refund=%d", round, ledgerCount(t, id, "RELEASE_BOOKING_FEE"), ledgerCount(t, id, "REFUND"))
		}
		if bal, held, _ := account(t, tenant); bal != 2_850_000 || held != 0 {
			t.Fatalf("round %d: tenant = %v/%v", round, bal, held)
		}
	}
}

func TestCalendarICS(t *testing.T) {
	landlord := login(t, "landlord")
	id := resetDeal(t, landlord, "funds_locked")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/deals/"+id+"/calendar.ics", nil)
	req.AddCookie(landlord.cookie)
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK || !strings.HasPrefix(res.Header.Get("Content-Type"), "text/calendar") ||
		strings.Count(string(body), "BEGIN:VEVENT") != 2 || !strings.Contains(string(body), "\r\n") {
		t.Errorf("ics: %d %s\n%s", res.StatusCode, res.Header.Get("Content-Type"), body)
	}
}
