-- name: ListPropertiesByLandlord :many
SELECT * FROM properties WHERE landlord_id = $1 ORDER BY created_at, id;

-- name: GetProperty :one
SELECT * FROM properties WHERE id = $1;
