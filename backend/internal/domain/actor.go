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
}
