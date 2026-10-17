package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"
)

func NewInvite() (tok string, hash []byte) {
	b := make([]byte, 32)
	_, _ = rand.Read(b) // crypto/rand.Read does not return an error in Go 1.24+.
	tok = base64.RawURLEncoding.EncodeToString(b)
	return tok, HashInvite(tok)
}

func HashInvite(tok string) []byte {
	h := sha256.Sum256([]byte(tok))
	return h[:]
}

const shareAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

func NewShareCode() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	out := make([]byte, 6)
	for i, v := range b {
		out[i] = shareAlphabet[int(v)%len(shareAlphabet)]
	}
	return "KS-" + string(out)
}

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

func FormatRefNo(t time.Time, seq int32) string {
	return fmt.Sprintf("KS-%02d%02d%02d-%04d", (t.Year()+543)%100, int(t.Month()), t.Day(), seq)
}
