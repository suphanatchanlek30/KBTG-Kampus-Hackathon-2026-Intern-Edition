-- +goose Up
-- Private demo sandboxes: each visitor's device gets its own landlord, tenant, accounts,
-- property and deals. Users and deals with a NULL sandbox_id are the shared demo accounts.
CREATE TABLE demo_sandboxes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demo_sandboxes_last_seen_idx ON demo_sandboxes(last_seen_at);

ALTER TABLE users ADD COLUMN sandbox_id uuid REFERENCES demo_sandboxes(id);
CREATE INDEX users_sandbox_idx ON users(sandbox_id) WHERE sandbox_id IS NOT NULL;

-- Usernames and phones are unique within a sandbox, so every sandbox can reuse the demo personas.
ALTER TABLE users DROP CONSTRAINT users_username_key, DROP CONSTRAINT users_phone_key;
CREATE UNIQUE INDEX users_scope_username_key
  ON users ((COALESCE(sandbox_id, '00000000-0000-0000-0000-000000000000'::uuid)), username);
CREATE UNIQUE INDEX users_scope_phone_key
  ON users ((COALESCE(sandbox_id, '00000000-0000-0000-0000-000000000000'::uuid)), phone);

ALTER TABLE deals ADD COLUMN sandbox_id uuid REFERENCES demo_sandboxes(id);
CREATE INDEX deals_sandbox_idx ON deals(sandbox_id) WHERE sandbox_id IS NOT NULL;

-- The ledger stays append-only. DELETE is allowed only inside a transaction that called
-- set_config('ksure.purge', 'on', true), which only the demo reset and the sandbox janitor do.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('ksure.purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ledger_events is append-only';
END; $$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
-- Remove sandbox data first; the old unique constraints cannot hold with it present.
SELECT set_config('ksure.purge', 'on', true);
DELETE FROM ledger_events  WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT NULL);
DELETE FROM deal_events    WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT NULL);
DELETE FROM deal_invites   WHERE deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT NULL);
DELETE FROM notifications  WHERE user_id IN (SELECT id FROM users WHERE sandbox_id IS NOT NULL)
                              OR deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT NULL);
DELETE FROM transfers      WHERE related_deal_id IN (SELECT id FROM deals WHERE sandbox_id IS NOT NULL)
                              OR from_account_id IN (SELECT a.id FROM demo_accounts a JOIN users u ON u.id = a.user_id WHERE u.sandbox_id IS NOT NULL)
                              OR to_account_id   IN (SELECT a.id FROM demo_accounts a JOIN users u ON u.id = a.user_id WHERE u.sandbox_id IS NOT NULL);
DELETE FROM idempotency_keys WHERE user_id IN (SELECT id FROM users WHERE sandbox_id IS NOT NULL);
DELETE FROM deals          WHERE sandbox_id IS NOT NULL;
DELETE FROM properties     WHERE landlord_id IN (SELECT id FROM users WHERE sandbox_id IS NOT NULL);
DELETE FROM demo_accounts  WHERE user_id IN (SELECT id FROM users WHERE sandbox_id IS NOT NULL);
DELETE FROM users          WHERE sandbox_id IS NOT NULL;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'ledger_events is append-only'; END; $$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP INDEX IF EXISTS deals_sandbox_idx;
ALTER TABLE deals DROP COLUMN IF EXISTS sandbox_id;
DROP INDEX IF EXISTS users_scope_username_key;
DROP INDEX IF EXISTS users_scope_phone_key;
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
DROP INDEX IF EXISTS users_sandbox_idx;
ALTER TABLE users DROP COLUMN IF EXISTS sandbox_id;
DROP TABLE IF EXISTS demo_sandboxes;
