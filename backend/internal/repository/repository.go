// Package repository ห่อโค้ดที่ sqlc generate (./db) และให้ service รันหลาย query ใน transaction เดียว
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

type Repository struct {
	pool *pgxpool.Pool
	*db.Queries
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, Queries: db.New(pool)}
}

// WithTx รัน fn ใน transaction เดียว — fn คืน error = rollback ทั้งหมด, คืน nil = commit
// ทุก action ที่เปลี่ยนเงินหรือ state ต้องผ่านที่นี่ (docs/03-architecture.md §3.4)
func (r *Repository) WithTx(ctx context.Context, fn func(q *db.Queries) error) (err error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
		if err != nil {
			if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
				err = errors.Join(err, fmt.Errorf("rollback: %w", rbErr))
			}
		}
	}()

	if err = fn(r.Queries.WithTx(tx)); err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// IsNotFound บอกว่า query :one ไม่เจอแถว
func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
