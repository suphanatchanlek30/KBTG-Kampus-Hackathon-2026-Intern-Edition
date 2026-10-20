-- name: GetDeal :one
SELECT * FROM deals WHERE id = $1;

-- name: GetDealForUpdate :one
SELECT * FROM deals WHERE id = $1 FOR UPDATE;

-- name: GetDealByShareCode :one
SELECT * FROM deals WHERE share_code = $1;

-- name: ShareCodeExists :one
SELECT EXISTS (SELECT 1 FROM deals WHERE share_code = $1);

-- name: NextRefSeq :one
INSERT INTO ref_counters (day, last_seq) VALUES ($1, 1)
ON CONFLICT (day) DO UPDATE SET last_seq = ref_counters.last_seq + 1
RETURNING last_seq;

-- name: UpdateDealState :execrows
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

-- name: GetActiveInvite :one
SELECT * FROM deal_invites
 WHERE deal_id = $1 AND revoked_at IS NULL AND expires_at > @now
 ORDER BY created_at DESC, id DESC
 LIMIT 1;

-- name: GetInviteByTokenHash :one
SELECT * FROM deal_invites WHERE token_hash = $1;

-- name: RevokeInvites :exec
UPDATE deal_invites SET revoked_at = @now WHERE deal_id = @deal_id AND revoked_at IS NULL;

-- name: MarkDealNotificationsRead :exec
UPDATE notifications SET read_at = @now
 WHERE user_id = @user_id AND deal_id = @deal_id AND type = @type AND read_at IS NULL;

-- name: UpdateDealCancel :execrows
UPDATE deals
   SET state = @state, version = version + 1, updated_at = @now,
       landlord_cancel_requested_at = COALESCE(sqlc.narg(landlord_requested_at), landlord_cancel_requested_at),
       tenant_cancel_requested_at = COALESCE(sqlc.narg(tenant_requested_at), tenant_cancel_requested_at)
 WHERE id = @id AND version = @version;

-- name: MarkDealIssue :execrows
UPDATE deals SET has_open_issue = true, version = version + 1, updated_at = @now
 WHERE id = @id AND version = @version;

-- name: ListDueDeals :many
SELECT d.id FROM deals d
 WHERE d.state IN ('WAITING_ACCEPT', 'FUNDS_LOCKED', 'BOOKING_FEE_RELEASED')
   AND (d.expires_at <= @now
        OR (d.state = 'WAITING_ACCEPT' AND NOT EXISTS (
              SELECT 1 FROM deal_invites i WHERE i.deal_id = d.id AND i.expires_at > @now AND i.revoked_at IS NULL)))
 ORDER BY d.expires_at
 LIMIT 50;

-- name: GetDealForUpdateSkipLocked :one
SELECT * FROM deals WHERE id = $1 FOR UPDATE SKIP LOCKED;

-- name: HasActiveInvite :one
SELECT EXISTS (SELECT 1 FROM deal_invites WHERE deal_id = @deal_id AND revoked_at IS NULL AND expires_at > @now);

-- name: GetDealParties :one
-- Everything buildDealDTO needs besides the history, in one round trip.
SELECT sqlc.embed(p),
       l.display_name AS landlord_display_name, l.short_name AS landlord_short_name,
       la.bank_name AS landlord_bank_name, la.account_no_masked AS landlord_account_no_masked,
       t.display_name AS tenant_display_name, t.short_name AS tenant_short_name,
       ta.bank_name AS tenant_bank_name, ta.account_no_masked AS tenant_account_no_masked,
       -- Empty when the deal has no invite yet.
       ARRAY(SELECT i.expires_at FROM deal_invites i
              WHERE i.deal_id = @deal_id
              ORDER BY i.created_at DESC, i.id DESC
              LIMIT 1)::timestamptz[] AS latest_invite_expires_at
  FROM properties p
  JOIN users l          ON l.id = @landlord_id
  JOIN demo_accounts la ON la.id = @landlord_account_id
  LEFT JOIN users t          ON t.id = sqlc.narg(tenant_id)
  LEFT JOIN demo_accounts ta ON ta.id = sqlc.narg(tenant_account_id)
 WHERE p.id = @property_id;

-- name: ListDealHistory :many
-- Deal events (kind 'E') and ledger events (kind 'L') for one deal, each in id order.
SELECT 'E'::text AS kind, e.id, e.event_type::text AS event_type, e.amount_satang, e.created_at
  FROM deal_events e WHERE e.deal_id = @deal_id
UNION ALL
SELECT 'L'::text AS kind, l.id, l.event_type::text AS event_type, l.amount_satang, l.created_at
  FROM ledger_events l WHERE l.deal_id = @deal_id
 ORDER BY kind, id;
