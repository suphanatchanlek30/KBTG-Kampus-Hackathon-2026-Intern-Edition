-- name: GetPrimaryAccount :one
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary;

-- name: GetPrimaryAccountForUpdate :one
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary FOR UPDATE;

-- name: SetAccountBalance :exec
UPDATE demo_accounts SET balance_satang = $2, held_satang = $3, updated_at = now() WHERE id = $1;

-- name: GetAccountsForUpdate :many
SELECT * FROM demo_accounts WHERE id = ANY(@ids::uuid[]) ORDER BY id FOR UPDATE;

-- name: AdjustAccount :exec
UPDATE demo_accounts
   SET balance_satang = balance_satang + @balance_delta, held_satang = held_satang + @held_delta, updated_at = @now
 WHERE id = @id;

-- name: GetAccount :one
SELECT * FROM demo_accounts WHERE id = $1;
