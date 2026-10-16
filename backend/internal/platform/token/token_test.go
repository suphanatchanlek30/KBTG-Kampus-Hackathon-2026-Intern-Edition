package token

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestFormatRefNo(t *testing.T) {
	bkk, _ := time.LoadLocation("Asia/Bangkok")
	// 14 ต.ค. 2569 → KS-691014-0458 (ตรง mockup)
	got := FormatRefNo(time.Date(2026, 10, 14, 10, 24, 0, 0, bkk), 458)
	if got != "KS-691014-0458" {
		t.Errorf("got %s", got)
	}
}

func TestShareCode(t *testing.T) {
	seen := map[string]bool{}
	for range 1000 {
		c := NewShareCode()
		if !IsShareCode(c) || strings.ContainsAny(c[3:], "01OI") {
			t.Fatalf("bad code %q", c)
		}
		seen[c] = true
	}
	if len(seen) < 990 {
		t.Errorf("too many collisions: %d unique of 1000", len(seen))
	}
	for _, c := range []string{"KS-8F4Q21", "KS-ABCDEF"} {
		if !IsShareCode(c) {
			t.Errorf("%s should be a share code", c)
		}
	}
	for _, c := range []string{"KS-8f4q21", "KS-8F4Q2", "XX-8F4Q21", "KS-8F4Q21X", "abc"} {
		if IsShareCode(c) {
			t.Errorf("%s should not be a share code", c)
		}
	}
}

func TestInviteToken(t *testing.T) {
	tok, hash := NewInvite()
	if len(tok) != 43 || IsShareCode(tok) {
		t.Errorf("token %q", tok)
	}
	if !bytes.Equal(hash, HashInvite(tok)) || len(hash) != 32 {
		t.Error("hash mismatch")
	}
}
