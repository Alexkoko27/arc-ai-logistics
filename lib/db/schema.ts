import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  ...timestamps(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  ...timestamps(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: text("role").notNull().default("dispatcher"),
    status: text("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => ({
    organizationUserIdx: uniqueIndex("organization_members_org_user_idx").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    unitNumber: text("unit_number").notNull(),
    vin: text("vin"),
    equipmentType: text("equipment_type"),
    status: text("status").notNull().default("available"),
    expectedAvailableAt: timestamp("expected_available_at", {
      withTimezone: true,
    }),
    homeLocationId: uuid("home_location_id").references(() => locations.id),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationIdx: index("vehicles_organization_id_idx").on(
      table.organizationId,
    ),
    idOrganizationIdx: uniqueIndex("vehicles_id_organization_id_idx").on(
      table.id,
      table.organizationId,
    ),
    organizationUnitIdx: uniqueIndex("vehicles_org_unit_number_idx").on(
      table.organizationId,
      table.unitNumber,
    ),
    statusCheck: check(
      "vehicles_status_check",
      sql`${table.status} IN ('available', 'busy', 'available_soon', 'offline', 'maintenance', 'driver_rest', 'inactive')`,
    ),
  }),
);

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    status: text("status").notNull().default("available"),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationIdx: index("drivers_organization_id_idx").on(
      table.organizationId,
    ),
    idOrganizationIdx: uniqueIndex("drivers_id_organization_id_idx").on(
      table.id,
      table.organizationId,
    ),
  }),
);

export const driverVehicleAssignments = pgTable(
  "driver_vehicle_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    driverId: uuid("driver_id").notNull().references(() => drivers.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    status: text("status").notNull().default("active"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    driverIdx: index("driver_vehicle_assignments_driver_id_idx").on(
      table.driverId,
    ),
    vehicleIdx: index("driver_vehicle_assignments_vehicle_id_idx").on(
      table.vehicleId,
    ),
    activeVehicleIdx: uniqueIndex(
      "driver_vehicle_assignments_active_vehicle_idx",
    )
      .on(table.vehicleId)
      .where(sql`${table.status} = 'active'`),
    driverOrganizationFk: foreignKey({
      columns: [table.driverId, table.organizationId],
      foreignColumns: [drivers.id, drivers.organizationId],
      name: "driver_vehicle_assignments_driver_org_fk",
    }),
    vehicleOrganizationFk: foreignKey({
      columns: [table.vehicleId, table.organizationId],
      foreignColumns: [vehicles.id, vehicles.organizationId],
      name: "driver_vehicle_assignments_vehicle_org_fk",
    }),
  }),
);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  label: text("label"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("US"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  timezone: text("timezone"),
  rawPayload: jsonb("raw_payload"),
  payloadHash: text("payload_hash"),
  ...timestamps(),
});

export const vehicleLocationEvents = pgTable(
  "vehicle_location_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    locationId: uuid("location_id").references(() => locations.id),
    sourceId: text("source_id"),
    externalId: text("external_id"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    headingDegrees: numeric("heading_degrees", { precision: 6, scale: 2 }),
    speedMph: numeric("speed_mph", { precision: 8, scale: 2 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    rawPayload: jsonb("raw_payload"),
    payloadHash: text("payload_hash"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    vehicleOccurredAtIdx: index("vehicle_location_events_vehicle_time_idx").on(
      table.vehicleId,
      table.occurredAt,
    ),
    externalIdx: index("vehicle_location_events_external_idx").on(
      table.sourceId,
      table.externalId,
    ),
  }),
);

export const loadSources = pgTable("load_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default("manual"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  ...timestamps(),
});

export const counterparties = pgTable(
  "counterparties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    counterpartyType: text("counterparty_type").notNull().default("broker"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    externalId: text("external_id"),
    sourceId: text("source_id"),
    rawPayload: jsonb("raw_payload"),
    payloadHash: text("payload_hash"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationIdx: index("counterparties_organization_id_idx").on(
      table.organizationId,
    ),
    externalIdx: index("counterparties_external_idx").on(
      table.sourceId,
      table.externalId,
    ),
  }),
);

export const loads = pgTable(
  "loads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    loadSourceId: uuid("load_source_id").references(() => loadSources.id),
    counterpartyId: uuid("counterparty_id").references(() => counterparties.id),
    sourceId: text("source_id"),
    externalId: text("external_id"),
    referenceNumber: text("reference_number"),
    status: text("status").notNull().default("available"),
    equipmentType: text("equipment_type"),
    cargoType: text("cargo_type"),
    weightLbs: integer("weight_lbs"),
    rateAmount: numeric("rate_amount", { precision: 18, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    distanceMiles: numeric("distance_miles", { precision: 10, scale: 2 }),
    pickupStartsAt: timestamp("pickup_starts_at", { withTimezone: true }),
    pickupEndsAt: timestamp("pickup_ends_at", { withTimezone: true }),
    deliveryStartsAt: timestamp("delivery_starts_at", { withTimezone: true }),
    deliveryEndsAt: timestamp("delivery_ends_at", { withTimezone: true }),
    rawPayload: jsonb("raw_payload"),
    payloadHash: text("payload_hash"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationStatusIdx: index("loads_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    idOrganizationIdx: uniqueIndex("loads_id_organization_id_idx").on(
      table.id,
      table.organizationId,
    ),
    externalIdx: index("loads_external_idx").on(table.sourceId, table.externalId),
  }),
);

export const loadStops = pgTable(
  "load_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    loadId: uuid("load_id").notNull().references(() => loads.id),
    locationId: uuid("location_id").references(() => locations.id),
    stopType: text("stop_type").notNull(),
    sequence: integer("sequence").notNull(),
    appointmentStartsAt: timestamp("appointment_starts_at", {
      withTimezone: true,
    }),
    appointmentEndsAt: timestamp("appointment_ends_at", { withTimezone: true }),
    instructions: text("instructions"),
    rawPayload: jsonb("raw_payload"),
    payloadHash: text("payload_hash"),
    ...timestamps(),
  },
  (table) => ({
    loadSequenceIdx: uniqueIndex("load_stops_load_sequence_idx").on(
      table.loadId,
      table.sequence,
    ),
  }),
);

export const matchingRuns = pgTable(
  "matching_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    status: text("status").notNull().default("pending"),
    inputSnapshot: jsonb("input_snapshot").notNull(),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    modelVersion: text("model_version"),
    explanation: text("explanation"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationIdx: index("matching_runs_organization_id_idx").on(
      table.organizationId,
    ),
    statusCheck: check(
      "matching_runs_status_check",
      sql`${table.status} IN ('pending', 'running', 'completed')`,
    ),
  }),
);

export const loadSuggestions = pgTable(
  "load_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    matchingRunId: uuid("matching_run_id")
      .notNull()
      .references(() => matchingRuns.id),
    loadId: uuid("load_id").notNull().references(() => loads.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    status: text("status").notNull().default("suggested"),
    rank: integer("rank"),
    scoreTotal: numeric("score_total", { precision: 10, scale: 4 }),
    scoreBreakdown: jsonb("score_breakdown"),
    estimatedDeadheadMiles: numeric("estimated_deadhead_miles", {
      precision: 10,
      scale: 2,
    }),
    estimatedProfit: numeric("estimated_profit", { precision: 18, scale: 2 }),
    explanation: text("explanation"),
    loadSnapshot: jsonb("load_snapshot").notNull(),
    vehicleSnapshot: jsonb("vehicle_snapshot").notNull(),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    modelVersion: text("model_version"),
    outcome: text("outcome"),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    matchingRunIdx: index("load_suggestions_matching_run_id_idx").on(
      table.matchingRunId,
    ),
    idOrganizationIdx: uniqueIndex(
      "load_suggestions_id_organization_id_idx",
    ).on(table.id, table.organizationId),
    idLoadOrganizationIdx: uniqueIndex(
      "load_suggestions_id_load_org_idx",
    ).on(table.id, table.loadId, table.organizationId),
    vehicleRankIdx: index("load_suggestions_vehicle_rank_idx").on(
      table.vehicleId,
      table.rank,
    ),
    loadOrganizationFk: foreignKey({
      columns: [table.loadId, table.organizationId],
      foreignColumns: [loads.id, loads.organizationId],
      name: "load_suggestions_load_org_fk",
    }),
    vehicleOrganizationFk: foreignKey({
      columns: [table.vehicleId, table.organizationId],
      foreignColumns: [vehicles.id, vehicles.organizationId],
      name: "load_suggestions_vehicle_org_fk",
    }),
    statusCheck: check(
      "load_suggestions_status_check",
      sql`${table.status} IN ('suggested', 'reserved')`,
    ),
  }),
);

export const loadReservations = pgTable(
  "load_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    loadId: uuid("load_id").notNull().references(() => loads.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    loadSuggestionId: uuid("load_suggestion_id")
      .notNull()
      .references(() => loadSuggestions.id),
    reservedByUserId: uuid("reserved_by_user_id").references(() => users.id),
    status: text("status").notNull().default("active"),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    activeLoadReservationIdx: uniqueIndex(
      "load_reservations_active_load_idx",
    )
      .on(table.loadId)
      .where(sql`${table.status} = 'active'`),
    activeSuggestionReservationIdx: uniqueIndex(
      "load_reservations_active_suggestion_idx",
    )
      .on(table.loadSuggestionId)
      .where(sql`${table.status} = 'active'`),
    loadIdx: index("load_reservations_load_id_idx").on(table.loadId),
    organizationIdx: index("load_reservations_organization_id_idx").on(
      table.organizationId,
    ),
    loadOrganizationFk: foreignKey({
      columns: [table.loadId, table.organizationId],
      foreignColumns: [loads.id, loads.organizationId],
      name: "load_reservations_load_org_fk",
    }),
    vehicleOrganizationFk: foreignKey({
      columns: [table.vehicleId, table.organizationId],
      foreignColumns: [vehicles.id, vehicles.organizationId],
      name: "load_reservations_vehicle_org_fk",
    }),
    suggestionLoadOrganizationFk: foreignKey({
      columns: [table.loadSuggestionId, table.loadId, table.organizationId],
      foreignColumns: [
        loadSuggestions.id,
        loadSuggestions.loadId,
        loadSuggestions.organizationId,
      ],
      name: "load_reservations_suggestion_load_org_fk",
    }),
  }),
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    loadId: uuid("load_id").references(() => loads.id),
    loadReservationId: uuid("load_reservation_id").references(
      () => loadReservations.id,
    ),
    counterpartyId: uuid("counterparty_id").references(() => counterparties.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    status: text("status").notNull().default("draft"),
    agreedRateAmount: numeric("agreed_rate_amount", {
      precision: 18,
      scale: 2,
    }),
    currency: text("currency").notNull().default("USD"),
    proposedAt: timestamp("proposed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    termsSnapshot: jsonb("terms_snapshot"),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    organizationStatusIdx: index("deals_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  }),
);

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  dealId: uuid("deal_id").references(() => deals.id),
  loadId: uuid("load_id").references(() => loads.id),
  externalRef: text("external_ref"),
  origin: text("origin"),
  destination: text("destination"),
  cargoType: text("cargo_type"),
  status: text("status").notNull().default("planned"),
  bookedAt: timestamp("booked_at", { withTimezone: true }),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  ...timestamps(),
});

export const dispatches = pgTable(
  "dispatches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),
    status: text("status").notNull().default("assigned"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    driverRespondedAt: timestamp("driver_responded_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps(),
  },
  (table) => ({
    shipmentIdx: index("dispatches_shipment_id_idx").on(table.shipmentId),
    vehicleStatusIdx: index("dispatches_vehicle_status_idx").on(
      table.vehicleId,
      table.status,
    ),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    actorType: text("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorAgentId: uuid("actor_agent_id").references(() => agents.id),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationCreatedAtIdx: index("audit_events_org_created_at_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    entityIdx: index("audit_events_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
  }),
);

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
