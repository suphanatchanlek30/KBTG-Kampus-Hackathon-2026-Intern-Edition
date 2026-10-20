-- name: CountUnreadNotifications :one
SELECT count(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL;

-- name: MarkNotificationsRead :exec
UPDATE notifications SET read_at = @read_at
 WHERE user_id = @user_id AND id = ANY(@ids::uuid[]) AND read_at IS NULL;

-- name: MarkAllNotificationsRead :exec
UPDATE notifications SET read_at = $2 WHERE user_id = $1 AND read_at IS NULL;

-- name: InsertNotification :exec
INSERT INTO notifications (user_id, type, deal_id, title, body, read_at, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: ListNotificationsWithUnread :many
SELECT sqlc.embed(n),
       (SELECT count(*) FROM notifications c WHERE c.user_id = @user_id AND c.read_at IS NULL) AS unread_count
  FROM notifications n
 WHERE n.user_id = @user_id
 ORDER BY n.created_at DESC, n.id
 LIMIT @row_limit;
