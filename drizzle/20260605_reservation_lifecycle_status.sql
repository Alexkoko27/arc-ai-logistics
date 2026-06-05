UPDATE load_reservations
SET status = 'released', updated_at = now()
WHERE status = 'cancelled';

ALTER TABLE load_reservations
  DROP CONSTRAINT IF EXISTS load_reservations_status_check;

ALTER TABLE load_reservations
  ADD CONSTRAINT load_reservations_status_check
  CHECK (status IN ('active', 'released', 'expired'));
