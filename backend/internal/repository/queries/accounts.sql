-- name: GetPrimaryAccount :one
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary;

-- name: GetPrimaryAccountForUpdate :one
-- ล็อกแถวไว้จนจบ transaction (กันยอดเงินชนกัน) — ล็อกหลายบัญชีให้เรียงตาม id เสมอ
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary FOR UPDATE;
