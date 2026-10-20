-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1;

-- name: GetUserByPhone :one
SELECT * FROM users WHERE phone = $1;

-- name: GetDefaultTenant :one
SELECT * FROM users WHERE role = 'TENANT' ORDER BY username = 'tenant' DESC, created_at LIMIT 1;

-- name: GetMe :one
SELECT sqlc.embed(u), sqlc.embed(a),
       (SELECT count(*) FROM notifications n WHERE n.user_id = u.id AND n.read_at IS NULL) AS unread_count
  FROM users u
  JOIN demo_accounts a ON a.user_id = u.id AND a.is_primary
 WHERE u.id = $1;
