package domain

import "github.com/google/uuid"

type Role string

const (
	RoleLandlord Role = "LANDLORD"
	RoleTenant   Role = "TENANT"
)

func (r Role) Valid() bool { return r == RoleLandlord || r == RoleTenant }

type Actor struct {
	UserID uuid.UUID
	Role   Role
	// SandboxID is set for a visitor's private demo sandbox; invalid for the shared demo accounts.
	SandboxID uuid.NullUUID
}

// SameSandbox reports whether something owned by sandbox belongs to this actor's sandbox.
func (a Actor) SameSandbox(sandbox uuid.NullUUID) bool {
	return a.SandboxID.Valid == sandbox.Valid && (!sandbox.Valid || a.SandboxID.UUID == sandbox.UUID)
}
