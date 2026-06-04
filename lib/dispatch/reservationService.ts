import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  loadReservations,
  loads,
  loadSuggestions,
} from "../db/schema";

type Db = ReturnType<typeof getDb>;

export class ActiveLoadReservationConflictError extends Error {
  constructor(loadId: string, options?: { cause?: unknown }) {
    super(`Load ${loadId} already has an active reservation.`, options);
    this.name = "ActiveLoadReservationConflictError";
  }
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

export async function reserveLoad({
  organizationId,
  loadId,
  vehicleId,
  driverId,
  loadSuggestionId,
  reservedByUserId,
  expiresAt,
  db = getDb(),
}: {
  organizationId: string;
  loadId: string;
  vehicleId?: string;
  driverId?: string;
  loadSuggestionId?: string;
  reservedByUserId?: string;
  expiresAt?: Date;
  db?: Db;
}) {
  let resolvedVehicleId = vehicleId;

  if (loadSuggestionId && !resolvedVehicleId) {
    const suggestion = (
      await db
        .select()
        .from(loadSuggestions)
        .where(
          and(
            eq(loadSuggestions.organizationId, organizationId),
            eq(loadSuggestions.id, loadSuggestionId),
          ),
        )
        .limit(1)
    )[0];

    if (!suggestion) {
      throw new Error(`Load suggestion ${loadSuggestionId} was not found.`);
    }

    resolvedVehicleId = suggestion.vehicleId;
  }

  try {
    const reservation = (
      await db
        .insert(loadReservations)
        .values({
          organizationId,
          loadId,
          vehicleId: resolvedVehicleId ?? null,
          driverId: driverId ?? null,
          loadSuggestionId: loadSuggestionId ?? null,
          reservedByUserId: reservedByUserId ?? null,
          status: "active",
          expiresAt: expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
          metadata: { stage: "1B" },
        })
        .returning()
    )[0];

    if (!reservation) {
      throw new Error("Failed to create load reservation.");
    }

    if (loadSuggestionId) {
      await db
        .update(loadSuggestions)
        .set({
          status: "reserved",
          outcome: "reserved",
          updatedAt: new Date(),
        })
        .where(eq(loadSuggestions.id, loadSuggestionId));
    }

    await db
      .update(loads)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(loads.id, loadId));

    return reservation;
  } catch (error) {
    if (isActiveReservationConflict(error)) {
      throw new ActiveLoadReservationConflictError(loadId, { cause: error });
    }

    throw error;
  }
}

export async function releaseLoadReservation({
  reservationId,
  releaseReason = "released",
  db = getDb(),
}: {
  reservationId: string;
  releaseReason?: "released" | "expired" | "cancelled";
  db?: Db;
}) {
  const reservation = (
    await db
      .update(loadReservations)
      .set({
        status: releaseReason,
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(loadReservations.id, reservationId))
      .returning()
  )[0];

  if (!reservation) {
    throw new Error(`Reservation ${reservationId} was not found.`);
  }

  await db
    .update(loads)
    .set({ status: "available", updatedAt: new Date() })
    .where(eq(loads.id, reservation.loadId));

  if (reservation.loadSuggestionId) {
    await db
      .update(loadSuggestions)
      .set({
        status: "suggested",
        outcome: "reservation_released",
        updatedAt: new Date(),
      })
      .where(eq(loadSuggestions.id, reservation.loadSuggestionId));
  }

  return reservation;
}
