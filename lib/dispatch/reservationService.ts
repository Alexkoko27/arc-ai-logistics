import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  drivers,
  loadReservations,
  loadStops,
  loads,
  loadSuggestions,
  locations,
  vehicles,
} from "../db/schema";
import { assertDevDispatcherDatabaseTarget } from "./devDatabaseGuard";

type Db = ReturnType<typeof getDb>;
type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type MutationDb = Db | TransactionDb;
type DateInput = string | Date | null | undefined;
type LoadRow = typeof loads.$inferSelect;
type LoadSuggestionRow = typeof loadSuggestions.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;
type LocationRow = typeof locations.$inferSelect;
type LoadStopRow = typeof loadStops.$inferSelect;

export type LoadSuggestionCurrentStop = LoadStopRow & {
  location: LocationRow | null;
};

type ReserveLoadInput = {
  organizationId: string;
  loadId: string;
  vehicleId?: string;
  driverId?: string;
  loadSuggestionId: string;
  reservedByUserId?: string;
  expiresAt?: DateInput;
};

type ReleaseReservationInput = {
  organizationId: string;
  reservationId: string;
  releaseReason?: "released" | "expired";
};

type ExpireReservationsInput = {
  organizationId: string;
  loadId?: string;
  now?: Date;
};

const activeReservationConstraintNames = [
  "load_reservations_active_load_idx",
  "load_reservations_active_suggestion_idx",
];
const reservableVehicleStatuses = ["available", "available_soon"];

export type DispatcherReservationDomainErrorCode =
  | "LOAD_SUGGESTION_NOT_RESERVABLE"
  | "RESERVATION_NOT_FOUND";

export class DispatcherReservationDomainError extends Error {
  constructor(
    public code: DispatcherReservationDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DispatcherReservationDomainError";
  }
}

export class ActiveLoadReservationConflictError extends Error {
  constructor(loadId: string, options?: { cause?: unknown }) {
    super(`Load ${loadId} already has an active reservation.`, options);
    this.name = "ActiveLoadReservationConflictError";
  }
}

function toDate(value: DateInput) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function loadSuggestionNotReservable(message: string) {
  return new DispatcherReservationDomainError(
    "LOAD_SUGGESTION_NOT_RESERVABLE",
    message,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function snapshotValue(snapshot: unknown, key: string) {
  if (!isRecord(snapshot)) return null;
  const value = snapshot[key];
  if (value === null || value === undefined) return null;
  return String(value);
}

function rowValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function snapshotDateValue(snapshot: unknown, key: string) {
  const value = snapshotValue(snapshot, key);
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function rowDateValue(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function valuesChanged(snapshot: string | null, current: string | null) {
  return snapshot !== current;
}

function numericValuesChanged(snapshot: string | null, current: string | null) {
  if (snapshot === null || current === null) return snapshot !== current;

  const snapshotNumber = Number(snapshot);
  const currentNumber = Number(current);
  if (!Number.isFinite(snapshotNumber) || !Number.isFinite(currentNumber)) {
    return snapshot !== current;
  }

  return snapshotNumber !== currentNumber;
}

function snapshotLocationValue(snapshot: unknown, key: string) {
  if (!isRecord(snapshot)) return null;
  return snapshotValue(snapshot.location, key);
}

function currentLocationValue(location: LocationRow | null, key: keyof LocationRow) {
  if (!location) return null;
  return rowValue(location[key] as string | number | null | undefined);
}

function stopKey(stop: { stopType: string; sequence: number }) {
  return `${stop.stopType}:${stop.sequence}`;
}

function snapshotStopKey(stop: unknown) {
  if (!isRecord(stop)) return null;
  const stopType = snapshotValue(stop, "stopType");
  const sequence = snapshotValue(stop, "sequence");
  return stopType && sequence ? `${stopType}:${sequence}` : null;
}

function currentStopsChanged(
  loadSnapshot: unknown,
  currentStops: LoadSuggestionCurrentStop[],
) {
  if (!isRecord(loadSnapshot) || !Array.isArray(loadSnapshot.stops)) {
    return true;
  }

  if (loadSnapshot.stops.length !== currentStops.length) {
    return true;
  }

  const currentStopsByKey = new Map(
    currentStops.map((stop) => [stopKey(stop), stop]),
  );

  return loadSnapshot.stops.some((snapshotStop) => {
    if (!isRecord(snapshotStop)) return true;

    const key = snapshotStopKey(snapshotStop);
    const currentStop = key ? currentStopsByKey.get(key) : null;
    if (!currentStop) return true;

    const stopChecks: Array<[string | null, string | null]> = [
      [snapshotValue(snapshotStop, "stopType"), rowValue(currentStop.stopType)],
      [snapshotValue(snapshotStop, "sequence"), rowValue(currentStop.sequence)],
      [
        snapshotDateValue(snapshotStop, "appointmentStartsAt"),
        rowDateValue(currentStop.appointmentStartsAt),
      ],
      [
        snapshotDateValue(snapshotStop, "appointmentEndsAt"),
        rowDateValue(currentStop.appointmentEndsAt),
      ],
      [snapshotLocationValue(snapshotStop, "id"), currentStop.locationId],
      [snapshotLocationValue(snapshotStop, "city"), currentLocationValue(currentStop.location, "city")],
      [snapshotLocationValue(snapshotStop, "state"), currentLocationValue(currentStop.location, "state")],
      [
        snapshotLocationValue(snapshotStop, "latitude"),
        currentLocationValue(currentStop.location, "latitude"),
      ],
      [
        snapshotLocationValue(snapshotStop, "longitude"),
        currentLocationValue(currentStop.location, "longitude"),
      ],
    ];

    return stopChecks.some(([snapshot, current]) => valuesChanged(snapshot, current));
  });
}

export function getLoadSuggestionReservabilityIssue({
  suggestion,
  load,
  vehicle,
  currentLoadStops,
}: {
  suggestion: LoadSuggestionRow;
  load: LoadRow | null;
  vehicle: VehicleRow | null;
  currentLoadStops: LoadSuggestionCurrentStop[];
}) {
  if (!load) {
    return "Load suggestion load is no longer available in this organization.";
  }

  if (!vehicle) {
    return "Load suggestion vehicle is no longer available in this organization.";
  }

  if (!reservableVehicleStatuses.includes(vehicle.status)) {
    return "Load suggestion vehicle is no longer operationally reservable.";
  }

  if (
    load.equipmentType &&
    vehicle.equipmentType &&
    load.equipmentType !== vehicle.equipmentType
  ) {
    return "Load suggestion vehicle no longer matches the load equipment.";
  }

  const loadSnapshot = suggestion.loadSnapshot;
  const vehicleSnapshot = suggestion.vehicleSnapshot;
  const loadTextChecks: Array<[string, string | null, string | null]> = [
    ["status", snapshotValue(loadSnapshot, "status"), rowValue(load.status)],
    [
      "equipmentType",
      snapshotValue(loadSnapshot, "equipmentType"),
      rowValue(load.equipmentType),
    ],
    ["cargoType", snapshotValue(loadSnapshot, "cargoType"), rowValue(load.cargoType)],
    ["currency", snapshotValue(loadSnapshot, "currency"), rowValue(load.currency)],
  ];
  const loadNumericChecks: Array<[string, string | null, string | null]> = [
    ["weightLbs", snapshotValue(loadSnapshot, "weightLbs"), rowValue(load.weightLbs)],
    ["rateAmount", snapshotValue(loadSnapshot, "rateAmount"), rowValue(load.rateAmount)],
    [
      "distanceMiles",
      snapshotValue(loadSnapshot, "distanceMiles"),
      rowValue(load.distanceMiles),
    ],
  ];
  const loadDateChecks: Array<[string, string | null, string | null]> = [
    [
      "pickupStartsAt",
      snapshotDateValue(loadSnapshot, "pickupStartsAt"),
      rowDateValue(load.pickupStartsAt),
    ],
    [
      "pickupEndsAt",
      snapshotDateValue(loadSnapshot, "pickupEndsAt"),
      rowDateValue(load.pickupEndsAt),
    ],
    [
      "deliveryStartsAt",
      snapshotDateValue(loadSnapshot, "deliveryStartsAt"),
      rowDateValue(load.deliveryStartsAt),
    ],
    [
      "deliveryEndsAt",
      snapshotDateValue(loadSnapshot, "deliveryEndsAt"),
      rowDateValue(load.deliveryEndsAt),
    ],
  ];

  if (loadTextChecks.some(([, snapshot, current]) => valuesChanged(snapshot, current))) {
    return "Load suggestion is stale because the load changed after matching.";
  }

  if (
    loadNumericChecks.some(([, snapshot, current]) =>
      numericValuesChanged(snapshot, current),
    )
  ) {
    return "Load suggestion is stale because the load changed after matching.";
  }

  if (loadDateChecks.some(([, snapshot, current]) => valuesChanged(snapshot, current))) {
    return "Load suggestion is stale because the load timing changed after matching.";
  }

  if (currentStopsChanged(loadSnapshot, currentLoadStops)) {
    return "Load suggestion is stale because the load stops changed after matching.";
  }

  const vehicleChecks: Array<[string, string | null, string | null]> = [
    [
      "equipmentType",
      snapshotValue(vehicleSnapshot, "equipmentType"),
      rowValue(vehicle.equipmentType),
    ],
    ["status", snapshotValue(vehicleSnapshot, "status"), rowValue(vehicle.status)],
    [
      "expectedAvailableAt",
      snapshotDateValue(vehicleSnapshot, "expectedAvailableAt"),
      rowDateValue(vehicle.expectedAvailableAt),
    ],
  ];

  if (vehicleChecks.some(([, snapshot, current]) => valuesChanged(snapshot, current))) {
    return "Load suggestion is stale because the vehicle changed after matching.";
  }

  return null;
}

function assertSuggestionStillMatchesCurrentState({
  suggestion,
  load,
  vehicle,
  currentLoadStops,
}: {
  suggestion: LoadSuggestionRow;
  load: LoadRow;
  vehicle: VehicleRow;
  currentLoadStops: LoadSuggestionCurrentStop[];
}) {
  const issue = getLoadSuggestionReservabilityIssue({
    suggestion,
    load,
    vehicle,
    currentLoadStops,
  });

  if (issue) {
    throw loadSuggestionNotReservable(issue);
  }
}

async function getCurrentLoadStops(
  db: MutationDb,
  organizationId: string,
  loadId: string,
) {
  const rows = await db
    .select({
      stop: loadStops,
      location: locations,
    })
    .from(loadStops)
    .leftJoin(
      locations,
      and(
        eq(loadStops.locationId, locations.id),
        eq(locations.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(loadStops.organizationId, organizationId),
        eq(loadStops.loadId, loadId),
      ),
    );

  return rows
    .map(({ stop, location }) => ({ ...stop, location }))
    .sort((a, b) => a.sequence - b.sequence);
}

function isActiveReservationConflict(error: unknown) {
  let currentError: unknown = error;

  while (isRecord(currentError)) {
    const code = currentError.code;
    const constraint = currentError.constraint ?? currentError.constraint_name;
    const message = currentError.message;
    const messageText = typeof message === "string" ? message : "";

    if (
      code === "23505" &&
      (typeof constraint !== "string" ||
        activeReservationConstraintNames.includes(constraint) ||
        activeReservationConstraintNames.some((name) =>
          messageText.includes(name),
        ))
    ) {
      return true;
    }

    currentError = currentError.cause;
  }

  return false;
}

async function lockLoadReservationWriteBoundary(db: MutationDb) {
  await db.execute(sql`lock table load_reservations in share row exclusive mode`);
}

async function releaseExpiredReservationsWithDb(
  db: MutationDb,
  input: ExpireReservationsInput,
) {
  const now = input.now ?? new Date();
  const expiredReservations = await db
    .update(loadReservations)
    .set({ status: "expired", releasedAt: now, updatedAt: now })
    .where(
      and(
        eq(loadReservations.organizationId, input.organizationId),
        eq(loadReservations.status, "active"),
        input.loadId ? eq(loadReservations.loadId, input.loadId) : undefined,
        sql`${loadReservations.expiresAt} <= ${now}`,
      ),
    )
    .returning();

  for (const reservation of expiredReservations) {
    const remainingActiveReservation = (
      await db
        .select({ id: loadReservations.id })
        .from(loadReservations)
        .where(
          and(
            eq(loadReservations.organizationId, reservation.organizationId),
            eq(loadReservations.loadId, reservation.loadId),
            eq(loadReservations.status, "active"),
          ),
        )
        .limit(1)
    )[0];

    if (!remainingActiveReservation) {
      await db
        .update(loads)
        .set({ status: "available", updatedAt: now })
        .where(
          and(
            eq(loads.id, reservation.loadId),
            eq(loads.organizationId, reservation.organizationId),
            eq(loads.status, "reserved"),
          ),
        );
    }

    await db
      .update(loadSuggestions)
      .set({
        status: "suggested",
        outcome: "reservation_expired",
        updatedAt: now,
      })
      .where(
        and(
          eq(loadSuggestions.id, reservation.loadSuggestionId),
          eq(loadSuggestions.organizationId, reservation.organizationId),
          eq(loadSuggestions.loadId, reservation.loadId),
        ),
      );
  }

  return expiredReservations;
}

export async function expireDispatcherReservations({
  db = getDb(),
  ...input
}: ExpireReservationsInput & { db?: Db }) {
  assertDevDispatcherDatabaseTarget("expire dispatcher reservations");

  return db.transaction(async (tx) => {
    await lockLoadReservationWriteBoundary(tx);
    return releaseExpiredReservationsWithDb(tx, input);
  });
}

async function findActiveReservationForSuggestion(
  db: MutationDb,
  input: Pick<ReserveLoadInput, "organizationId" | "loadId" | "loadSuggestionId">,
) {
  return (
    await db
      .select()
      .from(loadReservations)
      .where(
        and(
          eq(loadReservations.organizationId, input.organizationId),
          eq(loadReservations.loadId, input.loadId),
          eq(loadReservations.loadSuggestionId, input.loadSuggestionId),
          eq(loadReservations.status, "active"),
        ),
      )
      .limit(1)
  )[0];
}

async function assertDriverBelongsToOrganization(
  db: MutationDb,
  organizationId: string,
  driverId: string,
) {
  const driver = (
    await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, organizationId)))
      .limit(1)
  )[0];

  if (!driver) {
    throw new Error(`Driver ${driverId} was not found for this organization.`);
  }
}

async function reserveLoadWithDb(db: MutationDb, input: ReserveLoadInput) {
  await lockLoadReservationWriteBoundary(db);
  await releaseExpiredReservationsWithDb(db, {
    organizationId: input.organizationId,
    loadId: input.loadId,
  });

  if (!input.loadSuggestionId) {
    throw loadSuggestionNotReservable(
      "A reservable load suggestion is required to reserve a load.",
    );
  }

  const suggestion = (
    await db
      .select()
      .from(loadSuggestions)
      .where(
        and(
          eq(loadSuggestions.organizationId, input.organizationId),
          eq(loadSuggestions.id, input.loadSuggestionId),
        ),
      )
      .limit(1)
  )[0];

  if (!suggestion) {
    throw loadSuggestionNotReservable(
      "Load suggestion was not found for this organization.",
    );
  }

  if (suggestion.loadId !== input.loadId) {
    throw loadSuggestionNotReservable(
      "Load suggestion does not belong to the reserved load.",
    );
  }

  if (input.vehicleId && input.vehicleId !== suggestion.vehicleId) {
    throw new Error("Vehicle does not match the load suggestion vehicle.");
  }

  const existingReservation = await findActiveReservationForSuggestion(db, input);
  if (existingReservation) return existingReservation;

  if (suggestion.status !== "suggested") {
    throw loadSuggestionNotReservable(
      "Only suggested load suggestions can be reserved.",
    );
  }

  const load = (
    await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.id, input.loadId),
          eq(loads.organizationId, input.organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (!load) {
    throw new Error(`Load ${input.loadId} was not found for this organization.`);
  }

  if (load.status !== "available") {
    throw new ActiveLoadReservationConflictError(input.loadId);
  }

  const resolvedVehicleId = suggestion.vehicleId;
  const vehicle = (
    await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, resolvedVehicleId),
          eq(vehicles.organizationId, input.organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (!vehicle) {
    throw new Error(`Vehicle ${resolvedVehicleId} was not found for this organization.`);
  }

  const currentLoadStops = await getCurrentLoadStops(
    db,
    input.organizationId,
    input.loadId,
  );

  assertSuggestionStillMatchesCurrentState({
    suggestion,
    load,
    vehicle,
    currentLoadStops,
  });

  if (input.driverId) {
    await assertDriverBelongsToOrganization(db, input.organizationId, input.driverId);
  }

  const reservation = (
    await db
      .insert(loadReservations)
      .values({
        organizationId: input.organizationId,
        loadId: input.loadId,
        vehicleId: resolvedVehicleId,
        driverId: input.driverId ?? null,
        loadSuggestionId: input.loadSuggestionId,
        reservedByUserId: input.reservedByUserId ?? null,
        status: "active",
        expiresAt: toDate(input.expiresAt) ?? new Date(Date.now() + 30 * 60 * 1000),
        metadata: { stage: "1D-D-D" },
      })
      .returning()
  )[0];

  if (!reservation) {
    throw new Error("Failed to create load reservation.");
  }

  const updatedLoad = (
    await db
      .update(loads)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(
        and(
          eq(loads.id, input.loadId),
          eq(loads.organizationId, input.organizationId),
          eq(loads.status, "available"),
        ),
      )
      .returning()
  )[0];

  if (!updatedLoad) {
    throw new ActiveLoadReservationConflictError(input.loadId);
  }

  await db
    .update(loadSuggestions)
    .set({
      status: "reserved",
      outcome: "reserved",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(loadSuggestions.id, input.loadSuggestionId),
        eq(loadSuggestions.organizationId, input.organizationId),
        eq(loadSuggestions.loadId, input.loadId),
      ),
    );

  return reservation;
}

export async function reserveLoad({
  db = getDb(),
  ...input
}: ReserveLoadInput & { db?: Db }) {
  assertDevDispatcherDatabaseTarget("reserve dispatcher load");

  try {
    return await db.transaction((tx) => reserveLoadWithDb(tx, input));
  } catch (error) {
    if (isActiveReservationConflict(error)) {
      throw new ActiveLoadReservationConflictError(input.loadId, { cause: error });
    }

    throw error;
  }
}

async function releaseLoadReservationWithDb(
  db: MutationDb,
  input: Required<ReleaseReservationInput>,
) {
  await lockLoadReservationWriteBoundary(db);
  await releaseExpiredReservationsWithDb(db, { organizationId: input.organizationId });

  const reservation = (
    await db
      .update(loadReservations)
      .set({
        status: input.releaseReason,
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(loadReservations.id, input.reservationId),
          eq(loadReservations.organizationId, input.organizationId),
          eq(loadReservations.status, "active"),
        ),
      )
      .returning()
  )[0];

  if (!reservation) {
    const existingReservation = (
      await db
        .select()
        .from(loadReservations)
        .where(
          and(
            eq(loadReservations.id, input.reservationId),
            eq(loadReservations.organizationId, input.organizationId),
          ),
        )
        .limit(1)
    )[0];

    if (
      existingReservation?.status === "released" ||
      existingReservation?.status === "expired"
    ) {
      return existingReservation;
    }

    throw new DispatcherReservationDomainError(
      "RESERVATION_NOT_FOUND",
      `Active reservation ${input.reservationId} was not found for this organization.`,
    );
  }

  const remainingActiveReservation = (
    await db
      .select({ id: loadReservations.id })
      .from(loadReservations)
      .where(
        and(
          eq(loadReservations.organizationId, reservation.organizationId),
          eq(loadReservations.loadId, reservation.loadId),
          eq(loadReservations.status, "active"),
        ),
      )
      .limit(1)
  )[0];

  if (!remainingActiveReservation) {
    await db
      .update(loads)
      .set({ status: "available", updatedAt: new Date() })
      .where(
        and(
          eq(loads.id, reservation.loadId),
          eq(loads.organizationId, reservation.organizationId),
          eq(loads.status, "reserved"),
        ),
      );
  }

  await db
    .update(loadSuggestions)
    .set({
      status: "suggested",
      outcome: "reservation_released",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(loadSuggestions.id, reservation.loadSuggestionId),
        eq(loadSuggestions.organizationId, reservation.organizationId),
        eq(loadSuggestions.loadId, reservation.loadId),
      ),
    );

  return reservation;
}

export async function releaseLoadReservation({
  db = getDb(),
  releaseReason = "released",
  ...input
}: ReleaseReservationInput & { db?: Db }) {
  assertDevDispatcherDatabaseTarget("release dispatcher reservation");

  return db.transaction((tx) =>
    releaseLoadReservationWithDb(tx, { ...input, releaseReason }),
  );
}
