-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByUsername :one
-- A NULL sandbox_id means the shared demo accounts. The COALESCE matches users_scope_username_key.
SELECT * FROM users
 WHERE COALESCE(sandbox_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(sqlc.narg(sandbox_id)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
   AND username = @username;

-- name: GetUserByPhone :one
SELECT * FROM users
 WHERE COALESCE(sandbox_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(sqlc.narg(sandbox_id)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
   AND phone = @phone;

-- name: GetDefaultTenant :one
SELECT * FROM users
 WHERE role = 'TENANT' AND sandbox_id IS NOT DISTINCT FROM sqlc.narg(sandbox_id)::uuid
 ORDER BY username = 'tenant' DESC, created_at LIMIT 1;

-- name: GetMe :one
SELECT sqlc.embed(u), sqlc.embed(a),
       (SELECT count(*) FROM notifications n WHERE n.user_id = u.id AND n.read_at IS NULL) AS unread_count
  FROM users u
  JOIN demo_accounts a ON a.user_id = u.id AND a.is_primary
 WHERE u.id = $1;
