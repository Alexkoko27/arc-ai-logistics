ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_status_check;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_status_check
  CHECK (
    status IN (
      'available',
      'busy',
      'available_soon',
      'offline',
      'maintenance',
      'driver_rest',
      'inactive'
    )
  );

ALTER TABLE matching_runs
  DROP CONSTRAINT IF EXISTS matching_runs_status_check;

ALTER TABLE matching_runs
  ADD CONSTRAINT matching_runs_status_check
  CHECK (status IN ('pending', 'running', 'completed'));

ALTER TABLE load_suggestions
  DROP CONSTRAINT IF EXISTS load_suggestions_status_check;

ALTER TABLE load_suggestions
  ADD CONSTRAINT load_suggestions_status_check
  CHECK (status IN ('suggested', 'reserved'));
