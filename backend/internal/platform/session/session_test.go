package session

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
)

const secret = "0123456789abcdef0123456789abcdef"

var (
	start = time.Date(2026, 10, 14, 10, 0, 0, 0, time.UTC)
	actor = domain.Actor{UserID: uuid.MustParse("00000000-0000-0000-0000-00000000b001"), Role: domain.RoleTenant}
)

func TestIssueAndParse(t *testing.T) {
	m := NewManager(secret, time.Hour, clock.Fixed{T: start})
	tok, exp, err := m.Issue(actor)
	if err != nil {
		t.Fatal(err)
	}
	if !exp.Equal(start.Add(time.Hour)) {
		t.Errorf("expiresAt = %v", exp)
	}
	got, err := m.Parse(tok)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got != actor {
		t.Errorf("got %+v, want %+v", got, actor)
	}
}

func TestParseRejects(t *testing.T) {
	m := NewManager(secret, time.Hour, clock.Fixed{T: start})
	tok, _, _ := m.Issue(actor)

	later := NewManager(secret, time.Hour, clock.Fixed{T: start.Add(time.Hour + time.Second)})
	otherKey := NewManager(strings.Repeat("x", 32), time.Hour, clock.Fixed{T: start})

	parts := strings.Split(tok, ".")
	forgedPayload := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{Role: domain.RoleLandlord, RegisteredClaims: jwt.RegisteredClaims{
		Subject: actor.UserID.String(), Issuer: issuer, ExpiresAt: jwt.NewNumericDate(start.Add(time.Hour)),
	}})
	forgedTok, _ := forgedPayload.SigningString()
	forged := strings.Split(forgedTok, ".")[1]

	// alg=none
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, claims{Role: domain.RoleLandlord, RegisteredClaims: jwt.RegisteredClaims{
		Subject: actor.UserID.String(), Issuer: issuer, ExpiresAt: jwt.NewNumericDate(start.Add(time.Hour)),
	}}).SignedString(jwt.UnsafeAllowNoneSignatureType)

	cases := map[string]struct {
		m   *Manager
		tok string
	}{
		"expired":          {later, tok},
		"wrong secret":     {otherKey, tok},
		"tampered payload": {m, parts[0] + "." + forged + "." + parts[2]},
		"alg none":         {m, none},
		"garbage":          {m, "not-a-jwt"},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := c.m.Parse(c.tok); !errors.Is(err, ErrInvalid) {
				t.Errorf("err = %v, want ErrInvalid", err)
			}
		})
	}
}
