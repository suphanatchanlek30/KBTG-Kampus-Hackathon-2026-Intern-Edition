-- name: GetPrimaryAccount :one
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary;

-- name: GetPrimaryAccountForUpdate :one
-- ล็อกแถวไว้จนจบ transaction (กันยอดเงินชนกัน) — ล็อกหลายบัญชีให้เรียงตาม id เสมอ
SELECT * FROM demo_accounts WHERE user_id = $1 AND is_primary FOR UPDATE;

-- name: SetAccountBalance :exec
-- ใช้กับ demo reset เท่านั้น — action จริงปรับยอดผ่าน ledger (Phase 6)
UPDATE demo_accounts SET balance_satang = $2, held_satang = $3, updated_at = now() WHERE id = $1;

-- name: GetAccountsForUpdate :many
-- ล็อกหลายบัญชีเรียงตาม id เสมอ — กัน deadlock เมื่อสอง transaction ล็อกคู่บัญชีเดียวกันสลับลำดับ
SELECT * FROM demo_accounts WHERE id = ANY(@ids::uuid[]) ORDER BY id FOR UPDATE;

-- name: AdjustAccount :exec
-- เปลี่ยนยอดแบบบวก/ลบ — CHECK ในตารางกันยอดติดลบและ held > balance เป็นด่านสุดท้าย
UPDATE demo_accounts
   SET balance_satang = balance_satang + @balance_delta, held_satang = held_satang + @held_delta, updated_at = @now
 WHERE id = @id;

-- name: GetAccount :one
SELECT * FROM demo_accounts WHERE id = $1;
