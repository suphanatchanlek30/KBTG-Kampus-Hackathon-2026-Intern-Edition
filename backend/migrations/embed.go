// Package migrations ฝังไฟล์ goose (*.sql) ไว้ใน binary — API รัน migration เองตอน start ได้โดยไม่ต้องมีไฟล์ข้างนอก
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
