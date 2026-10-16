package domain

import "github.com/google/uuid"

// Role ของผู้ใช้เดโม — 1 คน 1 role (docs/04-database.md §2)
type Role string

const (
	RoleLandlord Role = "LANDLORD"
	RoleTenant   Role = "TENANT"
)

func (r Role) Valid() bool { return r == RoleLandlord || r == RoleTenant }

// Actor คือผู้ใช้ที่ล็อกอินอยู่ (อ่านจาก cookie แล้ว)
type Actor struct {
	UserID uuid.UUID
	Role   Role
}
