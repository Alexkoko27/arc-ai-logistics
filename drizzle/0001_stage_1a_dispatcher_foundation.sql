CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL DEFAULT 'dispatcher',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_idx
  ON organization_members(organization_id, user_id);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  label text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  timezone text,
  raw_payload jsonb,
  payload_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  unit_number text NOT NULL,
  vin text,
  equipment_type text,
  status text NOT NULL DEFAULT 'available',
  expected_available_at timestamptz,
  home_location_id uuid REFERENCES locations(id),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicles_organization_id_idx
  ON vehicles(organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_org_unit_number_idx
  ON vehicles(organization_id, unit_number);

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'available',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drivers_organization_id_idx
  ON drivers(organization_id);

CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  status text NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_vehicle_assignments_driver_id_idx
  ON driver_vehicle_assignments(driver_id);

CREATE INDEX IF NOT EXISTS driver_vehicle_assignments_vehicle_id_idx
  ON driver_vehicle_assignments(vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_location_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  location_id uuid REFERENCES locations(id),
  source_id text,
  external_id text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  heading_degrees numeric(6, 2),
  speed_mph numeric(8, 2),
  occurred_at timestamptz NOT NULL,
  raw_payload jsonb,
  payload_hash text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_location_events_vehicle_time_idx
  ON vehicle_location_events(vehicle_id, occurred_at);

CREATE INDEX IF NOT EXISTS vehicle_location_events_external_idx
  ON vehicle_location_events(source_id, external_id);

CREATE TABLE IF NOT EXISTS load_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'active',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  counterparty_type text NOT NULL DEFAULT 'broker',
  contact_name text,
  contact_email text,
  contact_phone text,
  external_id text,
  source_id text,
  raw_payload jsonb,
  payload_hash text,
  last_seen_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counterparties_organization_id_idx
  ON counterparties(organization_id);

CREATE INDEX IF NOT EXISTS counterparties_external_idx
  ON counterparties(source_id, external_id);

CREATE TABLE IF NOT EXISTS loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  load_source_id uuid REFERENCES load_sources(id),
  counterparty_id uuid REFERENCES counterparties(id),
  source_id text,
  external_id text,
  reference_number text,
  status text NOT NULL DEFAULT 'available',
  equipment_type text,
  cargo_type text,
  weight_lbs integer,
  rate_amount numeric(18, 2),
  currency text NOT NULL DEFAULT 'USD',
  distance_miles numeric(10, 2),
  pickup_starts_at timestamptz,
  pickup_ends_at timestamptz,
  delivery_starts_at timestamptz,
  delivery_ends_at timestamptz,
  raw_payload jsonb,
  payload_hash text,
  last_seen_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loads_org_status_idx
  ON loads(organization_id, status);

CREATE INDEX IF NOT EXISTS loads_external_idx
  ON loads(source_id, external_id);

CREATE TABLE IF NOT EXISTS load_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  load_id uuid NOT NULL REFERENCES loads(id),
  location_id uuid REFERENCES locations(id),
  stop_type text NOT NULL,
  sequence integer NOT NULL,
  appointment_starts_at timestamptz,
  appointment_ends_at timestamptz,
  instructions text,
  raw_payload jsonb,
  payload_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS load_stops_load_sequence_idx
  ON load_stops(load_id, sequence);

CREATE TABLE IF NOT EXISTS matching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  requested_by_user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending',
  input_snapshot jsonb NOT NULL,
  model_provider text,
  model_name text,
  model_version text,
  explanation text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matching_runs_organization_id_idx
  ON matching_runs(organization_id);

CREATE TABLE IF NOT EXISTS load_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  matching_run_id uuid NOT NULL REFERENCES matching_runs(id),
  load_id uuid NOT NULL REFERENCES loads(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  status text NOT NULL DEFAULT 'suggested',
  rank integer,
  score_total numeric(10, 4),
  score_breakdown jsonb,
  estimated_deadhead_miles numeric(10, 2),
  estimated_profit numeric(18, 2),
  explanation text,
  load_snapshot jsonb NOT NULL,
  vehicle_snapshot jsonb NOT NULL,
  model_provider text,
  model_name text,
  model_version text,
  outcome text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS load_suggestions_matching_run_id_idx
  ON load_suggestions(matching_run_id);

CREATE INDEX IF NOT EXISTS load_suggestions_vehicle_rank_idx
  ON load_suggestions(vehicle_id, rank);

CREATE TABLE IF NOT EXISTS load_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  load_id uuid NOT NULL REFERENCES loads(id),
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  load_suggestion_id uuid REFERENCES load_suggestions(id),
  reserved_by_user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'active',
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS load_reservations_active_load_idx
  ON load_reservations(load_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS load_reservations_load_id_idx
  ON load_reservations(load_id);

CREATE INDEX IF NOT EXISTS load_reservations_organization_id_idx
  ON load_reservations(organization_id);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  load_id uuid REFERENCES loads(id),
  load_reservation_id uuid REFERENCES load_reservations(id),
  counterparty_id uuid REFERENCES counterparties(id),
  created_by_user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'draft',
  agreed_rate_amount numeric(18, 2),
  currency text NOT NULL DEFAULT 'USD',
  proposed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  terms_snapshot jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_org_status_idx
  ON deals(organization_id, status);

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id),
  ADD COLUMN IF NOT EXISTS load_id uuid REFERENCES loads(id),
  ADD COLUMN IF NOT EXISTS booked_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE shipments
  ALTER COLUMN status SET DEFAULT 'planned';

CREATE TABLE IF NOT EXISTS dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  shipment_id uuid NOT NULL REFERENCES shipments(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  assigned_by_user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  driver_responded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatches_shipment_id_idx
  ON dispatches(shipment_id);

CREATE INDEX IF NOT EXISTS dispatches_vehicle_status_idx
  ON dispatches(vehicle_id, status);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  actor_agent_id uuid REFERENCES agents(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_org_created_at_idx
  ON audit_events(organization_id, created_at);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON audit_events(entity_type, entity_id);
