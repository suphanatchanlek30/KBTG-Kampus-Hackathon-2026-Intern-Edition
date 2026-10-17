-- name: ListPendingInvites :many
SELECT DISTINCT ON (d.id)
       d.id AS deal_id, l.short_name AS from_short_name, n.created_at AS sent_at,
       p.project_name, p.unit_no, d.viewing_at, d.total_satang, d.share_code
  FROM notifications n
  JOIN deals d      ON d.id = n.deal_id
  JOIN users l      ON l.id = d.landlord_id
  JOIN properties p ON p.id = d.property_id
 WHERE n.user_id = @tenant_id
   AND n.type = 'DEAL_INVITE'
   AND d.state = 'WAITING_ACCEPT'
   AND d.expires_at > @now
   AND EXISTS (SELECT 1 FROM deal_invites i
                WHERE i.deal_id = d.id AND i.revoked_at IS NULL AND i.expires_at > @now)
 ORDER BY d.id, n.created_at DESC;

-- name: ListActiveDeals :many
SELECT d.id AS deal_id, d.state, p.project_name, p.unit_no, d.total_satang
  FROM deals d
  JOIN properties p ON p.id = d.property_id
 WHERE (d.landlord_id = @user_id AND d.state IN ('WAITING_ACCEPT', 'FUNDS_LOCKED', 'BOOKING_FEE_RELEASED'))
    OR (d.tenant_id = @user_id AND d.state IN ('FUNDS_LOCKED', 'BOOKING_FEE_RELEASED'))
 ORDER BY d.created_at DESC;
