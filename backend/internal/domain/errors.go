// Package domain เก็บ type / enum / error ของธุรกิจ — ไม่รู้จัก Fiber หรือ DB
package domain

import (
	"errors"
	"net/http"
)

// Code คือรหัส error คงที่ที่ส่งให้ frontend (docs/05-api.md §1 รูปแบบ error)
type Code string

const (
	CodeValidationFailed       Code = "VALIDATION_FAILED"
	CodeIdempotencyKeyRequired Code = "IDEMPOTENCY_KEY_REQUIRED"
	CodeUnauthenticated        Code = "UNAUTHENTICATED"
	CodeForbiddenRole          Code = "FORBIDDEN_ROLE"
	CodeNotDealParty           Code = "NOT_DEAL_PARTY"
	CodeNotFound               Code = "NOT_FOUND"
	CodeDealStateConflict      Code = "DEAL_STATE_CONFLICT"
	CodeVersionMismatch        Code = "VERSION_MISMATCH"
	CodeIdempotencyConflict    Code = "IDEMPOTENCY_CONFLICT"
	CodeInviteExpired          Code = "INVITE_EXPIRED"
	CodeInsufficientBalance    Code = "INSUFFICIENT_BALANCE"
	CodeRateLimited            Code = "RATE_LIMITED"
	CodeInternal               Code = "INTERNAL"
	// /readyz ต่อ DB ไม่ได้ — ใช้กับ health check เท่านั้น ไม่ถึง frontend
	CodeNotReady Code = "NOT_READY"
)

var statusByCode = map[Code]int{
	CodeValidationFailed:       http.StatusBadRequest,
	CodeIdempotencyKeyRequired: http.StatusBadRequest,
	CodeUnauthenticated:        http.StatusUnauthorized,
	CodeForbiddenRole:          http.StatusForbidden,
	CodeNotDealParty:           http.StatusForbidden,
	CodeNotFound:               http.StatusNotFound,
	CodeDealStateConflict:      http.StatusConflict,
	CodeVersionMismatch:        http.StatusConflict,
	CodeIdempotencyConflict:    http.StatusConflict,
	CodeInviteExpired:          http.StatusGone,
	CodeInsufficientBalance:    http.StatusUnprocessableEntity,
	CodeRateLimited:            http.StatusTooManyRequests,
	CodeInternal:               http.StatusInternalServerError,
	CodeNotReady:               http.StatusServiceUnavailable,
}

// AppError คือ error ที่ตั้งใจส่งให้ผู้ใช้ — message เป็นภาษาไทยพร้อมแสดง · Err (ถ้ามี) ใช้ log เท่านั้น ไม่ส่งออกไป
type AppError struct {
	Code    Code
	Message string
	Details []FieldError
	Err     error
}

// FieldError บอกช่องที่กรอกผิด (VALIDATION_FAILED)
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return string(e.Code) + ": " + e.Err.Error()
	}
	return string(e.Code) + ": " + e.Message
}

func (e *AppError) Unwrap() error { return e.Err }

// Status คือ HTTP status ของรหัสนี้ (ไม่รู้จัก = 500)
func (e *AppError) Status() int {
	if s, ok := statusByCode[e.Code]; ok {
		return s
	}
	return http.StatusInternalServerError
}

func NewError(code Code, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

// Wrap ห่อ error ภายในให้เป็น AppError โดยไม่เปิดเผยรายละเอียดให้ผู้ใช้
func Wrap(code Code, message string, err error) *AppError {
	return &AppError{Code: code, Message: message, Err: err}
}

// AsAppError คืน AppError ถ้า err เป็น (หรือห่อ) AppError
func AsAppError(err error) (*AppError, bool) {
	var ae *AppError
	ok := errors.As(err, &ae)
	return ae, ok
}
