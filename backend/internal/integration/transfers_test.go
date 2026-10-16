package integration

import (
	"fmt"
	"net/http"
	"testing"
)

const landlordAccount = "00000000-0000-0000-0000-0000000aa001"

// T8: ผู้เช่าโอนหาผู้ให้เช่าที่ยังมีดีลค้าง → เตือน · ไม่มีดีลค้าง → ไม่เตือน
func TestTransferPrecheckWarnsOffDealPayment(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")

	_, payees := tenant.do(http.MethodGet, "/transfers/payees", "")
	first := payees["items"].([]any)[0].(map[string]any)
	if first["accountId"] != landlordAccount || first["displayName"] != "สมชาย ใจดี" {
		t.Fatalf("payees = %v", payees)
	}

	body := fmt.Sprintf(`{"toAccountId":%q,"amountSatang":300000}`, landlordAccount)
	for _, tc := range []struct {
		scenario string
		warn     bool
	}{{"funds_locked", true}, {"booking_released", true}, {"released", false}, {"fresh", false}} {
		resetDeal(t, landlord, tc.scenario)
		res, out := tenant.do(http.MethodPost, "/transfers/precheck", body)
		if res.StatusCode != http.StatusOK || (out["warning"] != nil) != tc.warn {
			t.Errorf("%s: %d %v", tc.scenario, res.StatusCode, out)
		}
		if tc.warn && str(out, "warning", "unitNo") != "A1203" {
			t.Errorf("%s: warning = %v", tc.scenario, out["warning"])
		}
	}
}

func TestTransferCancelAndConfirm(t *testing.T) {
	landlord, tenant := login(t, "landlord"), login(t, "tenant")
	resetDeal(t, landlord, "funds_locked") // ผู้เช่า 28,500 กันไว้ 6,500 → ใช้ได้ 22,000
	body := func(action string, amount int) string {
		return fmt.Sprintf(`{"toAccountId":%q,"amountSatang":%d,"memo":"ค่าส่วนกลางล่วงหน้า","action":%q}`, landlordAccount, amount, action)
	}

	res, out := tenant.post("/transfers", body("CANCEL", 300000))
	if res.StatusCode != http.StatusCreated || str(out, "status") != "CANCELLED_BY_USER" || out["warningShown"] != true {
		t.Fatalf("cancel: %d %v", res.StatusCode, out)
	}
	if bal, _, _ := account(t, tenant); bal != 2_850_000 {
		t.Errorf("cancel moved money: %v", bal)
	}

	res, out = tenant.post("/transfers", body("CONFIRM", 300000))
	if res.StatusCode != http.StatusCreated || str(out, "status") != "COMPLETED_SIMULATED" {
		t.Fatalf("confirm: %d %v", res.StatusCode, out)
	}
	if bal, held, avl := account(t, tenant); bal != 2_550_000 || held != 650_000 || avl != 1_900_000 {
		t.Errorf("tenant = %v/%v/%v", bal, held, avl)
	}
	if bal, _, _ := account(t, landlord); bal != 4_585_000 {
		t.Errorf("landlord = %v", bal)
	}

	// เงินที่ถูกกันไว้ใช้โอนไม่ได้ — ใช้ได้เหลือ 19,000
	res, out = tenant.post("/transfers", body("CONFIRM", 2_000_000))
	if res.StatusCode != http.StatusUnprocessableEntity || errorCode(out) != "INSUFFICIENT_BALANCE" {
		t.Errorf("over available: %d %v", res.StatusCode, out)
	}
	res, out = tenant.post("/transfers", `{"toAccountId":"00000000-0000-0000-0000-0000000bb001","amountSatang":100,"action":"CONFIRM"}`)
	if res.StatusCode != http.StatusBadRequest {
		t.Errorf("to self: %d %v", res.StatusCode, out)
	}
}
