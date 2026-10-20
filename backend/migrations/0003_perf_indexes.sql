-- +goose Up
-- Covers the notification list (all rows, newest first) and the per-user lookups in
-- ListPendingInvites and MarkDealNotificationsRead. The older partial index only covers unread rows.
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC, id);

-- +goose Down
DROP INDEX IF EXISTS notifications_user_created_idx;
