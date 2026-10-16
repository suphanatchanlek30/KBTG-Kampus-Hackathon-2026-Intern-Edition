package service

import (
	"testing"
	"time"
)

func TestComputeDemoTimes(t *testing.T) {
	bkk, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		t.Fatal(err)
	}
	at := func(s string) time.Time {
		v, err := time.ParseInLocation("2006-01-02 15:04", s, bkk)
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	day := func(s string) time.Time { return at(s + " 00:00") }

	tests := []struct {
		name                     string
		now                      string
		created, viewing, moveIn time.Time
		expires                  string
	}{
		{
			name: "วันศุกร์ตอนเย็น ใช้ 10:24 ของวันนี้ (ตรง mockup)",
			now:  "2026-10-16 20:00", created: at("2026-10-16 10:24"),
			viewing: at("2026-10-18 14:00"), moveIn: day("2026-11-01"), expires: "2026-11-03 23:59:59",
		},
		{
			name: "ยังไม่ถึง 10:24 ใช้ now − 10 นาที",
			now:  "2026-10-16 09:00", created: at("2026-10-16 08:50"),
			viewing: at("2026-10-18 14:00"), moveIn: day("2026-11-01"), expires: "2026-11-03 23:59:59",
		},
		{
			name: "วันอาทิตย์ นัดดูห้องอาทิตย์หน้า ไม่ใช่วันนี้",
			now:  "2026-10-18 12:00", created: at("2026-10-18 10:24"),
			viewing: at("2026-10-25 14:00"), moveIn: day("2026-11-01"), expires: "2026-11-03 23:59:59",
		},
		{
			name: "อาทิตย์ถัดไปเลยวันที่ 1 → เข้าอยู่เดือนถัดไปอีก (ข้ามปี)",
			now:  "2026-11-30 12:00", created: at("2026-11-30 10:24"),
			viewing: at("2026-12-06 14:00"), moveIn: day("2027-01-01"), expires: "2027-01-03 23:59:59",
		},
		{
			name: "อาทิตย์ถัดไปตรงวันที่ 1 พอดี ใช้วันนั้นได้",
			now:  "2026-10-30 12:00", created: at("2026-10-30 10:24"),
			viewing: at("2026-11-01 14:00"), moveIn: day("2026-11-01"), expires: "2026-11-03 23:59:59",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			now := at(tt.now)
			got := ComputeDemoTimes(now, bkk, 24*time.Hour)

			if !got.Created.Equal(tt.created) {
				t.Errorf("Created = %v, want %v", got.Created, tt.created)
			}
			if !got.ViewingAt.Equal(tt.viewing) {
				t.Errorf("ViewingAt = %v, want %v", got.ViewingAt, tt.viewing)
			}
			if !got.MoveInDate.Equal(tt.moveIn) {
				t.Errorf("MoveInDate = %v, want %v", got.MoveInDate, tt.moveIn)
			}
			if s := got.ExpiresAt.In(bkk).Format("2006-01-02 15:04:05"); s != tt.expires {
				t.Errorf("ExpiresAt = %s, want %s", s, tt.expires)
			}

			// เหตุการณ์ที่เกิดแล้วต้องอยู่ในอดีตและเรียงลำดับ — ไม่งั้นไทม์ไลน์กลับหัว
			order := []time.Time{got.Created, got.InviteSent, got.Accepted, got.ViewingConfirmed, got.MoveInConfirmed}
			for i := 1; i < len(order); i++ {
				if order[i].Before(order[i-1]) {
					t.Errorf("event %d (%v) before event %d (%v)", i, order[i], i-1, order[i-1])
				}
			}
			if got.MoveInConfirmed.After(now) {
				t.Errorf("MoveInConfirmed %v is in the future", got.MoveInConfirmed)
			}
			// ดีลต้องยังไม่หมดอายุ และคำเชิญยังใช้ได้
			if !got.ExpiresAt.After(now) || !got.InviteExpires.After(now) {
				t.Errorf("deal/invite already expired: %+v", got)
			}
		})
	}
}
