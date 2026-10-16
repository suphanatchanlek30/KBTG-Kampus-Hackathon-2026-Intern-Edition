-- name: GetDeal :one
SELECT * FROM deals WHERE id = $1;

-- name: GetDealForUpdate :one
-- ล็อกแถวดีลจนจบ transaction — action อื่นบนดีลเดียวกันต้องรอคิว (docs/04-database.md §6)
SELECT * FROM deals WHERE id = $1 FOR UPDATE;

-- name: GetDealByShareCode :one
SELECT * FROM deals WHERE share_code = $1;

-- name: ShareCodeExists :one
SELECT EXISTS (SELECT 1 FROM deals WHERE share_code = $1);

-- name: NextRefSeq :one
-- ลำดับรายวันของ ref_no (KS-YYMMDD-NNNN) — แถวของวันถูกล็อกจน commit จึงไม่ซ้ำแม้สร้างพร้อมกัน
INSERT INTO ref_counters (day, last_seq) VALUES ($1, 1)
ON CONFLICT (day) DO UPDATE SET last_seq = ref_counters.last_seq + 1
RETURNING last_seq;

-- name: UpdateDealState :execrows
-- optimistic concurrency: version ไม่ตรง = 0 แถว → VERSION_MISMATCH
UPDATE deals
   SET state = @state, version = version + 1, updated_at = @now,
       tenant_id = COALESCE(sqlc.narg(tenant_id), tenant_id),
       tenant_account_id = COALESCE(sqlc.narg(tenant_account_id), tenant_account_id)
 WHERE id = @id AND version = @version;

-- name: ListDealsForUser :many
SELECT d.id, d.ref_no, d.state, d.total_satang, d.created_at, d.landlord_id, p.project_name, p.unit_no
  FROM deals d JOIN properties p ON p.id = d.property_id
 WHERE d.landlord_id = @user_id OR d.tenant_id = @user_id
 ORDER BY d.created_at DESC
 LIMIT 100;

-- name: ListDealEvents :many
SELECT * FROM deal_events WHERE deal_id = $1 ORDER BY id;

-- name: ListLedgerEvents :many
SELECT * FROM ledger_events WHERE deal_id = $1 ORDER BY id;

-- name: GetActiveInvite :one
-- คำเชิญล่าสุดที่ยังใช้ได้ของดีล
SELECT * FROM deal_invites
 WHERE deal_id = $1 AND revoked_at IS NULL AND expires_at > @now
 ORDER BY created_at DESC, id DESC
 LIMIT 1;

-- name: GetLatestInvite :one
-- คำเชิญล่าสุด (รวมที่ถูก revoke แล้วหลังผู้เช่าตอบ) — DealDTO.invite แสดงเป็นประวัติ
SELECT * FROM deal_invites WHERE deal_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1;

-- name: GetInviteByTokenHash :one
SELECT * FROM deal_invites WHERE token_hash = $1;

-- name: RevokeInvites :exec
UPDATE deal_invites SET revoked_at = @now WHERE deal_id = @deal_id AND revoked_at IS NULL;

-- name: MarkDealNotificationsRead :exec
UPDATE notifications SET read_at = @now
 WHERE user_id = @user_id AND deal_id = @deal_id AND type = @type AND read_at IS NULL;

-- name: UpdateDealCancel :execrows
-- บันทึกคำขอยกเลิกของฝ่ายหนึ่ง (state เดิม) หรือฝ่ายที่สองยินยอม (state = REFUNDED) — version+1 เสมอ
UPDATE deals
   SET state = @state, version = version + 1, updated_at = @now,
       landlord_cancel_requested_at = COALESCE(sqlc.narg(landlord_requested_at), landlord_cancel_requested_at),
       tenant_cancel_requested_at = COALESCE(sqlc.narg(tenant_requested_at), tenant_cancel_requested_at)
 WHERE id = @id AND version = @version;

-- name: MarkDealIssue :execrows
UPDATE deals SET has_open_issue = true, version = version + 1, updated_at = @now
 WHERE id = @id AND version = @version;

-- name: ListDueDeals :many
-- ขั้น 1 ของ expiry worker: หา candidate แบบไม่ล็อก (docs/04-database.md §6.5)
SELECT d.id FROM deals d
 WHERE d.state IN ('WAITING_ACCEPT', 'FUNDS_LOCKED', 'BOOKING_FEE_RELEASED')
   AND (d.expires_at <= @now
        OR (d.state = 'WAITING_ACCEPT' AND NOT EXISTS (
              SELECT 1 FROM deal_invites i WHERE i.deal_id = d.id AND i.expires_at > @now AND i.revoked_at IS NULL)))
 ORDER BY d.expires_at
 LIMIT 50;

-- name: GetDealForUpdateSkipLocked :one
-- ขั้น 2: ได้ 0 แถว = มีคนถือ lock อยู่ (เช่น ผู้เช่ากำลัง confirm) → ข้าม รอบหน้าค่อยดู
SELECT * FROM deals WHERE id = $1 FOR UPDATE SKIP LOCKED;

-- name: HasActiveInvite :one
SELECT EXISTS (SELECT 1 FROM deal_invites WHERE deal_id = @deal_id AND revoked_at IS NULL AND expires_at > @now);
