CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref text,
  origin text,
  destination text,
  cargo_type text,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id),
  status text NOT NULL DEFAULT 'pending',
  total_cost_usdc numeric(18, 6) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  requested_agent_set jsonb,
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE analysis_runs IS
  'Primary business entity: users pay for AI analysis execution, shipment data is input/context.';

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  description text,
  default_price_usdc numeric(18, 6) NOT NULL DEFAULT 0,
  owner_user_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES analysis_runs(id),
  agent_id uuid NOT NULL REFERENCES agents(id),
  status text NOT NULL DEFAULT 'pending',
  agent_version text,
  agent_snapshot jsonb,
  input_hash text,
  output_summary text,
  score numeric(18, 6),
  cost_usdc numeric(18, 6) NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES analysis_runs(id),
  amount_usdc numeric(18, 6) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  circle_transaction_id text,
  arc_tx_hash text,
  explorer_url text,
  raw_circle_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid NOT NULL REFERENCES payment_records(id),
  agent_run_id uuid NOT NULL REFERENCES agent_runs(id),
  agent_id uuid NOT NULL REFERENCES agents(id),
  amount_usdc numeric(18, 6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  analysis_run_id uuid REFERENCES analysis_runs(id),
  payment_record_id uuid REFERENCES payment_records(id),
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analysis_runs_shipment_id_idx ON analysis_runs(shipment_id);
CREATE INDEX IF NOT EXISTS analysis_runs_payment_status_idx ON analysis_runs(payment_status);
CREATE INDEX IF NOT EXISTS agent_runs_analysis_run_id_idx ON agent_runs(analysis_run_id);
CREATE INDEX IF NOT EXISTS agent_runs_agent_id_idx ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS payment_records_analysis_run_id_idx ON payment_records(analysis_run_id);
CREATE INDEX IF NOT EXISTS payment_records_circle_transaction_id_idx
  ON payment_records(circle_transaction_id);
CREATE INDEX IF NOT EXISTS agent_payment_allocations_payment_record_id_idx
  ON agent_payment_allocations(payment_record_id);
CREATE INDEX IF NOT EXISTS agent_payment_allocations_agent_run_id_idx
  ON agent_payment_allocations(agent_run_id);
CREATE INDEX IF NOT EXISTS system_events_analysis_run_id_idx ON system_events(analysis_run_id);
