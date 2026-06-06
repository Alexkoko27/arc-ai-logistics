CREATE UNIQUE INDEX IF NOT EXISTS drivers_id_organization_id_idx
  ON drivers (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_id_organization_id_idx
  ON vehicles (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS driver_vehicle_assignments_active_vehicle_idx
  ON driver_vehicle_assignments (vehicle_id)
  WHERE status = 'active';

ALTER TABLE driver_vehicle_assignments
  DROP CONSTRAINT IF EXISTS driver_vehicle_assignments_driver_org_fk;

ALTER TABLE driver_vehicle_assignments
  ADD CONSTRAINT driver_vehicle_assignments_driver_org_fk
  FOREIGN KEY (driver_id, organization_id)
  REFERENCES drivers (id, organization_id);

ALTER TABLE driver_vehicle_assignments
  DROP CONSTRAINT IF EXISTS driver_vehicle_assignments_vehicle_org_fk;

ALTER TABLE driver_vehicle_assignments
  ADD CONSTRAINT driver_vehicle_assignments_vehicle_org_fk
  FOREIGN KEY (vehicle_id, organization_id)
  REFERENCES vehicles (id, organization_id);
