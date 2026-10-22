package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/repository"
	"github.com/suphanatchanlek30/psure/backend/internal/repository/db"
)

type IdemRequest struct {
	Key         string
	MethodPath  string // Stored for request auditing.
	RequestHash string
}

type Response struct {
	Status   int
	Body     []byte
	Replayed bool
}

type redactor interface{ Redacted() any }

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
