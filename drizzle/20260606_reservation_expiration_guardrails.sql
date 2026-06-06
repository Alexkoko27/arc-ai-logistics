CREATE INDEX IF NOT EXISTS load_reservations_active_expiration_idx
  ON load_reservations (organization_id, expires_at)
  WHERE status = 'active';
