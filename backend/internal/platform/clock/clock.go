// Package clock ให้ทุกส่วนอ่านเวลาปัจจุบันจากที่เดียว — เดโมหยุดเวลาได้ (DEMO_FROZEN_NOW) และ test กำหนดเวลาเองได้
package clock

import "time"

type Clock interface {
	Now() time.Time
}

// System คือเวลาจริง
type System struct{}

func (System) Now() time.Time { return time.Now() }

// Shifted เริ่มที่ start แล้วเดินตามเวลาจริง — ใช้กับ DEMO_FROZEN_NOW
// (เวลายังเดิน เพื่อให้ลำดับเหตุการณ์ในไทม์ไลน์ถูก แต่วันที่ตรงกับสคริปต์เดโม)
type Shifted struct {
	offset time.Duration
}

func NewShifted(start time.Time) Shifted {
	return Shifted{offset: time.Until(start)}
}

func (s Shifted) Now() time.Time { return time.Now().Add(s.offset) }

// Fixed คืนเวลาเดิมเสมอ — สำหรับ test
type Fixed struct {
	T time.Time
}

func (f Fixed) Now() time.Time { return f.T }
