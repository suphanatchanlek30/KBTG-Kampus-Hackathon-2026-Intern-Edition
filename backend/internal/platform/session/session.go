package session

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
)

const (
	CookieName = "ks_session"
	issuer     = "ksure-api"
)

var ErrInvalid = errors.New("invalid session")

type claims struct {
	Role domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type Manager struct {
	secret []byte
	ttl    time.Duration
	clock  clock.Clock
}

func NewManager(secret string, ttl time.Duration, c clock.Clock) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl, clock: c}
}

func (m *Manager) TTL() time.Duration { return m.ttl }

func (m *Manager) Issue(actor domain.Actor) (token string, expiresAt time.Time, err error) {
	now := m.clock.Now()
	expiresAt = now.Add(m.ttl)
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		Role: actor.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   actor.UserID.String(),
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	})
	token, err = t.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign session: %w", err)
	}
	return token, expiresAt, nil
}

func (m *Manager) Parse(token string) (domain.Actor, error) {
	var c claims
	_, err := jwt.ParseWithClaims(token, &c, func(*jwt.Token) (any, error) { return m.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(m.clock.Now),
	)
	if err != nil {
		return domain.Actor{}, fmt.Errorf("%w: %w", ErrInvalid, err)
	}
	id, err := uuid.Parse(c.Subject)
	if err != nil || !c.Role.Valid() {
		return domain.Actor{}, ErrInvalid
	}
	return domain.Actor{UserID: id, Role: c.Role}, nil
}
