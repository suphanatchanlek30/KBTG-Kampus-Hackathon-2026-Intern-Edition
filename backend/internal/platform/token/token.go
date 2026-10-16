// Package token สุ่มรหัสต่างๆ ด้วย crypto/rand (docs/04-database.md §4)
package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"
)

// NewInvite สุ่ม invite token 32 bytes (base64url) — DB เก็บเฉพาะ hash ห้ามเก็บ token จริง
func NewInvite() (tok string, hash []byte) {
	b := make([]byte, 32)
	_, _ = rand.Read(b) // crypto/rand.Read ไม่คืน error ตั้งแต่ Go 1.24
	tok = base64.RawURLEncoding.EncodeToString(b)
	return tok, HashInvite(tok)
}

// HashInvite คือ sha256 ของ token — ใช้ค้นคำเชิญจาก QR
func HashInvite(tok string) []byte {
	h := sha256.Sum256([]byte(tok))
	return h[:]
}

// ตัด 0/O/1/I ที่อ่านสับสน (docs/04-database.md §4)
const shareAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

// NewShareCode สุ่ม KS- + 6 ตัว · ชนกันให้สุ่มใหม่ (ผู้เรียกตรวจ)
func NewShareCode() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	out := make([]byte, 6)
	for i, v := range b {
		// 256 หาร 32 ลงตัว → ไม่เอียง
		out[i] = shareAlphabet[int(v)%len(shareAlphabet)]
	}
	return "KS-" + string(out)
}

// IsShareCode บอกว่าเป็นรหัสที่พิมพ์/สแกนได้ (KS-XXXXXX) ไม่ใช่ token จาก QR
// รับตัวเลข 0–9 และ A–Z ทั้งหมด เพราะรหัสใน seed (KS-8F4Q21) มีเลข 1
func IsShareCode(s string) bool {
	if len(s) != 9 || s[:3] != "KS-" {
		return false
	}
	for _, c := range s[3:] {
		if (c < '0' || c > '9') && (c < 'A' || c > 'Z') {
			return false
		}
	}
	return true
}

// FormatRefNo = KS-YYMMDD-NNNN · YY = ปี พ.ศ. 2 หลัก · วันที่ตามเวลาไทย (ส่ง t ที่ In(loc) แล้ว)
func FormatRefNo(t time.Time, seq int32) string {
	return fmt.Sprintf("KS-%02d%02d%02d-%04d", (t.Year()+543)%100, int(t.Month()), t.Day(), seq)
}
