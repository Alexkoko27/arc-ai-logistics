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

  if (input.vehicleId && input.vehicleId !== suggestion.vehicleId) {
    throw new Error("Vehicle does not match the load suggestion vehicle.");
  }

  const resolvedVehicleId = suggestion.vehicleId;

  await assertVehicleBelongsToOrganization(
    db,
    input.organizationId,
    resolvedVehicleId,
  );

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
