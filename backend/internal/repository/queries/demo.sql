-- name: TruncateDemoData :exec
-- ล้างทุกอย่างที่เกิดระหว่างเดโม (users/accounts/properties คงไว้) — TRUNCATE ไม่เรียก trigger append-only ของ ledger
TRUNCATE ledger_events, deal_events, deal_invites, notifications, transfers, idempotency_keys, deals, ref_counters
  RESTART IDENTITY CASCADE;

-- name: InsertDeal :one
INSERT INTO deals (ref_no, share_code, landlord_id, landlord_account_id, tenant_id, tenant_account_id, property_id,
                   total_satang, booking_fee_satang, main_deposit_satang, viewing_at, move_in_date, expires_at,
                   state, version, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
RETURNING id;

-- name: InsertDealInvite :exec
INSERT INTO deal_invites (deal_id, token_hash, channel, target_user_id, expires_at, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: InsertDealEvent :exec
INSERT INTO deal_events (deal_id, event_type, actor_id, from_state, to_state, amount_satang, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: InsertLedgerEvent :exec
INSERT INTO ledger_events (deal_id, event_type, amount_satang, from_account_id, to_account_id, actor_id,
                           idempotency_key, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
