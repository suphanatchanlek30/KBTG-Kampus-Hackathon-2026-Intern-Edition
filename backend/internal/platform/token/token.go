// Package token สุ่มรหัสต่างๆ ด้วย crypto/rand (docs/04-database.md §4)
package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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
