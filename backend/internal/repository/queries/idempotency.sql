-- name: LockIdempotencyKey :exec
SELECT pg_advisory_xact_lock(hashtextextended(@user_id::text || ':' || @key::text, 0));

-- name: GetIdempotencyKey :one
SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2;

-- name: InsertIdempotencyKey :exec
INSERT INTO idempotency_keys (user_id, key, method_path, request_hash, status_code, response_body, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7);
