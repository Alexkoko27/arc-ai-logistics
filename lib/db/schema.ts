import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

function timestamps() {
  return {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  };
}

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalRef: text("external_ref"),
  origin: text("origin"),
  destination: text("destination"),
  cargoType: text("cargo_type"),
  status: text("status").notNull().default("draft"),
  metadata: jsonb("metadata"),
  ...timestamps(),
});

export const analysisRuns = pgTable("analysis_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").references(() => shipments.id),
  // analysis_runs is intentionally the primary business entity: users pay for
  // AI analysis execution, while shipment data is input/context for that run.
  status: text("status").notNull().default("pending"),
  totalCostUsdc: numeric("total_cost_usdc", {
    precision: 18,
    scale: 6,
  }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  requestedAgentSet: jsonb("requested_agent_set"),
  resultSummary: text("result_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  defaultPriceUsdc: numeric("default_price_usdc", {
    precision: 18,
    scale: 6,
  }).notNull().default("0"),
  ownerUserId: text("owner_user_id"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisRunId: uuid("analysis_run_id")
    .notNull()
    .references(() => analysisRuns.id),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  status: text("status").notNull().default("pending"),
  agentVersion: text("agent_version"),
  agentSnapshot: jsonb("agent_snapshot"),
  inputHash: text("input_hash"),
  outputSummary: text("output_summary"),
  score: numeric("score", { precision: 18, scale: 6 }),
  costUsdc: numeric("cost_usdc", {
    precision: 18,
    scale: 6,
  }).notNull().default("0"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps(),
});

export const paymentRecords = pgTable("payment_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisRunId: uuid("analysis_run_id")
    .notNull()
    .references(() => analysisRuns.id),
  amountUsdc: numeric("amount_usdc", {
    precision: 18,
    scale: 6,
  }).notNull(),
  status: text("status").notNull().default("pending"),
  circleTransactionId: text("circle_transaction_id"),
  arcTxHash: text("arc_tx_hash"),
  explorerUrl: text("explorer_url"),
  rawCircleResponse: jsonb("raw_circle_response"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agentPaymentAllocations = pgTable("agent_payment_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentRecordId: uuid("payment_record_id")
    .notNull()
    .references(() => paymentRecords.id),
  agentRunId: uuid("agent_run_id").notNull().references(() => agentRuns.id),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  amountUsdc: numeric("amount_usdc", {
    precision: 18,
    scale: 6,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemEvents = pgTable("system_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("info"),
  analysisRunId: uuid("analysis_run_id").references(() => analysisRuns.id),
  paymentRecordId: uuid("payment_record_id").references(() => paymentRecords.id),
  message: text("message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
