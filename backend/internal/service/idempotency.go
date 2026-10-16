package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

// IdemRequest มาจาก middleware Idempotency (header Idempotency-Key + hash ของ method/path/body)
type IdemRequest struct {
	Key         string
	MethodPath  string // "POST /api/v1/deals/:id/confirm-viewing" — ไว้ดูใน DB
	RequestHash string
}

// Response คือคำตอบ JSON ที่บันทึกไว้ — ส่งซ้ำได้ทุกครั้งที่ใช้ key เดิม
type Response struct {
	Status   int
	Body     []byte
	Replayed bool
}

// redactor = คำตอบที่มีข้อมูลห้ามเก็บ (เช่น QR token ใน DealDTO)
type redactor interface{ Redacted() any }

// runIdempotent รัน action ใน transaction เดียวกับการบันทึกคำตอบ (docs/05-api.md §1 Idempotency)
//
//  1. ล็อก (user, key) ด้วย advisory lock — request key เดิมที่มาพร้อมกันต้องรอคิว
//  2. มีคำตอบเดิมแล้ว: body ต่าง → IDEMPOTENCY_CONFLICT · body เดิม → ส่งคำตอบเดิม ไม่ทำซ้ำ
//  3. ยังไม่มี: รัน fn แล้วบันทึกคำตอบก่อน commit — commit ไม่ผ่าน = ไม่มีทั้งผลของ action และคำตอบ
//
// บันทึกเฉพาะคำตอบที่สำเร็จ — fn คืน error (เช่น ยอดไม่พอ) = rollback ทั้งหมด ลองใหม่ด้วย key เดิมได้
// ผลลัพธ์ที่มีความลับ (redactor) เก็บเป็นฉบับตัดความลับ แต่ตอบครั้งแรกด้วยฉบับเต็ม
func runIdempotent(ctx context.Context, repo *repository.Repository, actor domain.Actor, req IdemRequest,
	now time.Time, status int, fn func(q *db.Queries) (any, error)) (Response, error) {
	var out Response
	err := repo.WithTx(ctx, func(q *db.Queries) error {
		if err := q.LockIdempotencyKey(ctx, db.LockIdempotencyKeyParams{UserID: actor.UserID.String(), Key: req.Key}); err != nil {
			return fmt.Errorf("lock idempotency key: %w", err)
		}
		prev, err := q.GetIdempotencyKey(ctx, db.GetIdempotencyKeyParams{UserID: actor.UserID, Key: req.Key})
		switch {
		case err == nil:
			if prev.RequestHash != req.RequestHash {
				return domain.NewError(domain.CodeIdempotencyConflict, "Idempotency-Key นี้ถูกใช้กับคำขออื่นแล้ว")
			}
			out = Response{Status: int(prev.StatusCode), Body: prev.ResponseBody, Replayed: true}
			return nil
		case !repository.IsNotFound(err):
			return fmt.Errorf("get idempotency key: %w", err)
		}

		result, err := fn(q)
		if err != nil {
			return err
		}
		body, err := json.Marshal(result)
		if err != nil {
			return fmt.Errorf("marshal response: %w", err)
		}
		stored := body
		if r, ok := result.(redactor); ok {
			if stored, err = json.Marshal(r.Redacted()); err != nil {
				return fmt.Errorf("marshal stored response: %w", err)
			}
		}
		if err := q.InsertIdempotencyKey(ctx, db.InsertIdempotencyKeyParams{
			UserID: actor.UserID, Key: req.Key, MethodPath: req.MethodPath, RequestHash: req.RequestHash,
			StatusCode: int32(status), ResponseBody: stored, CreatedAt: now,
		}); err != nil {
			return fmt.Errorf("save idempotency key: %w", err)
		}
		out = Response{Status: status, Body: body}
		return nil
	})
	return out, err
}
