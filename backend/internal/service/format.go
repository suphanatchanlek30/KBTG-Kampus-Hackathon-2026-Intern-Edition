package service

import (
	"time"

	"github.com/google/uuid"
)

// iso แปลงเวลาเป็น ISO-8601 พร้อม offset ของ APP_TZ (เช่น 2026-10-18T14:00:00+07:00)
func iso(t time.Time, loc *time.Location) string {
	return t.In(loc).Format(time.RFC3339)
}

func isoPtr(t *time.Time, loc *time.Location) *string {
	if t == nil {
		return nil
	}
	s := iso(*t, loc)
	return &s
}

func nullUUIDPtr(id uuid.NullUUID) *string {
	if !id.Valid {
		return nil
	}
	s := id.UUID.String()
	return &s
}
