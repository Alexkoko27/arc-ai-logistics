CREATE UNIQUE INDEX IF NOT EXISTS loads_id_organization_id_idx
  ON loads (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_id_organization_id_idx
  ON vehicles (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS load_suggestions_id_organization_id_idx
  ON load_suggestions (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS load_suggestions_id_load_org_idx
  ON load_suggestions (id, load_id, organization_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_suggestions_load_org_fk'
      AND conrelid = 'load_suggestions'::regclass
  ) THEN
    ALTER TABLE load_suggestions
      ADD CONSTRAINT load_suggestions_load_org_fk
      FOREIGN KEY (load_id, organization_id)
      REFERENCES loads (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_suggestions_vehicle_org_fk'
      AND conrelid = 'load_suggestions'::regclass
  ) THEN
    ALTER TABLE load_suggestions
      ADD CONSTRAINT load_suggestions_vehicle_org_fk
      FOREIGN KEY (vehicle_id, organization_id)
      REFERENCES vehicles (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_reservations_load_org_fk'
      AND conrelid = 'load_reservations'::regclass
  ) THEN
    ALTER TABLE load_reservations
      ADD CONSTRAINT load_reservations_load_org_fk
      FOREIGN KEY (load_id, organization_id)
      REFERENCES loads (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_reservations_vehicle_org_fk'
      AND conrelid = 'load_reservations'::regclass
  ) THEN
    ALTER TABLE load_reservations
      ADD CONSTRAINT load_reservations_vehicle_org_fk
      FOREIGN KEY (vehicle_id, organization_id)
      REFERENCES vehicles (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_reservations_suggestion_load_org_fk'
      AND conrelid = 'load_reservations'::regclass
  ) THEN
    ALTER TABLE load_reservations
      ADD CONSTRAINT load_reservations_suggestion_load_org_fk
      FOREIGN KEY (load_suggestion_id, load_id, organization_id)
      REFERENCES load_suggestions (id, load_id, organization_id);
  END IF;
END $$;
