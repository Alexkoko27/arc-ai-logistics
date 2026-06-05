DO $$
DECLARE
  nullable_reservations integer;
BEGIN
  SELECT count(*)
    INTO nullable_reservations
    FROM load_reservations
    WHERE load_suggestion_id IS NULL;

  IF nullable_reservations > 0 THEN
    RAISE EXCEPTION 'Cannot require load_reservations.load_suggestion_id while % existing reservation rows are null.', nullable_reservations;
  END IF;
END $$;

ALTER TABLE load_reservations
  ALTER COLUMN load_suggestion_id SET NOT NULL;
