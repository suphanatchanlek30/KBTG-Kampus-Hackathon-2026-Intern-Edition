-- name: ListPayees :many
SELECT a.id AS account_id, u.display_name, a.bank_name, a.account_no_masked
  FROM demo_accounts a JOIN users u ON u.id = a.user_id
 WHERE a.is_primary AND a.user_id <> @user_id
 ORDER BY u.role, u.username;

-- name: FindOpenDealWithPayee :one
SELECT d.id, d.ref_no, p.unit_no
  FROM deals d JOIN properties p ON p.id = d.property_id
 WHERE d.tenant_id = @user_id
   AND d.landlord_account_id = @to_account_id
   AND d.state IN ('WAITING_ACCEPT', 'FUNDS_LOCKED', 'BOOKING_FEE_RELEASED')
 ORDER BY d.created_at DESC
 LIMIT 1;

-- name: InsertTransfer :one
INSERT INTO transfers (from_account_id, to_account_id, amount_satang, memo, status, warning_shown, related_deal_id, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;
