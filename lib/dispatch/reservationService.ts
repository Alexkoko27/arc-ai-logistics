import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  drivers,
  loadReservations,
  loads,
  loadSuggestions,
  vehicles,
} from "../db/schema";
import { assertDevDispatcherDatabaseTarget } from "./devDatabaseGuard";

type Db = ReturnType<typeof getDb>;
type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type MutationDb = Db | TransactionDb;
type DateInput = string | Date | null | undefined;

type ReserveLoadInput = {
  organizationId: string;
  loadId: string;
  vehicleId?: string;
  driverId?: string;
  loadSuggestionId?: string;
  reservedByUserId?: string;
  expiresAt?: DateInput;
};

type ReleaseReservationInput = {
  organizationId: string;
  reservationId: string;
  releaseReason?: "released" | "expired" | "cancelled";
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isActiveReservationConflict(error: unknown) {
  let currentError: unknown = error;

  while (isRecord(currentError)) {
    const code = currentError.code;
    const constraint = currentError.constraint ?? currentError.constraint_name;
    const message = currentError.message;

    if (
      code === "23505" ||
      constraint === "load_reservations_active_load_idx" ||
      (typeof message === "string" &&
        message.includes("load_reservations_active_load_idx"))
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

async function assertVehicleBelongsToOrganization(
  db: MutationDb,
  organizationId: string,
  vehicleId: string,
) {
  const vehicle = (
    await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, organizationId)))
      .limit(1)
  )[0];

  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} was not found for this organization.`);
  }
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

  let resolvedVehicleId = input.vehicleId;

  if (input.loadSuggestionId) {
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
      throw new Error(
        `Load suggestion ${input.loadSuggestionId} was not found for this organization.`,
      );
    }

    if (suggestion.loadId !== input.loadId) {
      throw new Error("Load suggestion does not belong to the reserved load.");
    }

    if (suggestion.status !== "suggested") {
      throw new DispatcherReservationDomainError(
        "LOAD_SUGGESTION_NOT_RESERVABLE",
        "Only suggested load suggestions can be reserved.",
      );
    }

    if (resolvedVehicleId && resolvedVehicleId !== suggestion.vehicleId) {
      throw new Error("Vehicle does not match the load suggestion vehicle.");
    }

    resolvedVehicleId = suggestion.vehicleId;
  }

  if (resolvedVehicleId) {
    await assertVehicleBelongsToOrganization(
      db,
      input.organizationId,
      resolvedVehicleId,
    );
  }

  if (input.driverId) {
    await assertDriverBelongsToOrganization(db, input.organizationId, input.driverId);
  }

  const reservation = (
    await db
      .insert(loadReservations)
      .values({
        organizationId: input.organizationId,
        loadId: input.loadId,
        vehicleId: resolvedVehicleId ?? null,
        driverId: input.driverId ?? null,
        loadSuggestionId: input.loadSuggestionId ?? null,
        reservedByUserId: input.reservedByUserId ?? null,
        status: "active",
        expiresAt: toDate(input.expiresAt) ?? new Date(Date.now() + 30 * 60 * 1000),
        metadata: { stage: "1D-D-A" },
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

  if (input.loadSuggestionId) {
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
  }

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

  if (reservation.loadSuggestionId) {
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
  }

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
