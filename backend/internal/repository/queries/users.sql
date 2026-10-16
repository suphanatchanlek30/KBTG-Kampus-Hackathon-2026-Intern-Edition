-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1;

-- name: GetUserByPhone :one
SELECT * FROM users WHERE phone = $1;
