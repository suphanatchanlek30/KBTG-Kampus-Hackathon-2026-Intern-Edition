-- Scope queries take a nullable sandbox_id: NULL means the shared demo accounts.

-- name: CountSandboxes :one
SELECT count(*) FROM demo_sandboxes;

-- name: InsertSandbox :one
INSERT INTO demo_sandboxes (created_at, last_seen_at) VALUES (@now, @now) RETURNING id;

-- name: TouchSandbox :exec
UPDATE demo_sandboxes SET last_seen_at = @now WHERE id = @id AND last_seen_at < @stale_before;

-- name: ListStaleSandboxes :many
SELECT id FROM demo_sandboxes WHERE last_seen_at < @before ORDER BY last_seen_at LIMIT @row_limit;

-- name: InsertUser :one
INSERT INTO users (username, role, display_name, short_name, phone, sandbox_id)
VALUES (@username, @role, @display_name, @short_name, @phone, @sandbox_id)
RETURNING id;

-- name: InsertAccount :one
INSERT INTO demo_accounts (user_id, bank_name, account_type, account_no_masked, balance_satang, is_primary)
VALUES (@user_id, @bank_name, @account_type, @account_no_masked, @balance_satang, true)
RETURNING id;

-- name: InsertProperty :exec
INSERT INTO properties (landlord_id, property_type, project_name, unit_no, detail_label, nearby_label)
VALUES (@landlord_id, @property_type, @project_name, @unit_no, @detail_label, @nearby_label);

-- name: EnablePurge :exec
-- Lets this transaction delete ledger rows (see forbid_ledger_mutation).
SELECT set_config('ksure.purge', 'on', true);

-- name: PurgeScopeLedger :exec
DELETE FROM ledger_events
 WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeDealEvents :exec
DELETE FROM deal_events
 WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeInvites :exec
DELETE FROM deal_invites
 WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeNotifications :exec
DELETE FROM notifications
 WHERE user_id IN (SELECT id FROM users WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid)
    OR deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeTransfers :exec
DELETE FROM transfers
 WHERE from_account_id IN (SELECT a.id FROM demo_accounts a JOIN users u ON u.id = a.user_id
                            WHERE u.sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid)
    OR related_deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeIdempotency :exec
DELETE FROM idempotency_keys
 WHERE user_id IN (SELECT id FROM users WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid);

-- name: PurgeScopeDeals :exec
DELETE FROM deals WHERE sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid;

-- name: DeleteSandboxProperties :exec
-- Run the PurgeScope queries before deleting a sandbox's people.
DELETE FROM properties WHERE landlord_id IN (SELECT u.id FROM users u WHERE u.sandbox_id = @sandbox_id);

-- name: DeleteSandboxAccounts :exec
DELETE FROM demo_accounts WHERE user_id IN (SELECT u.id FROM users u WHERE u.sandbox_id = @sandbox_id);

-- name: DeleteSandboxUsers :exec
DELETE FROM users WHERE sandbox_id = @sandbox_id;

-- name: DeleteSandbox :exec
DELETE FROM demo_sandboxes WHERE id = @sandbox_id;

