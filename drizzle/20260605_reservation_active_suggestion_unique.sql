CREATE UNIQUE INDEX IF NOT EXISTS load_reservations_active_suggestion_idx
  ON load_reservations (load_suggestion_id)
  WHERE status = 'active';
