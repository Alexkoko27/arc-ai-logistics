import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  loadReservations,
  loadStops,
  loads,
  locations,
} from "../db/schema";
import type {
  DispatcherCreateLoadInput,
  DispatcherEditLoadInput,
  DispatcherLocationInput,
} from "./validation";

type Db = ReturnType<typeof getDb>;
type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type MutationDb = Db | TransactionDb;
type LoadInsert = typeof loads.$inferInsert;
type LoadUpdate = Partial<LoadInsert>;
type LocationInsert = typeof locations.$inferInsert;

const dispatcherUiSourceId = "dispatcher-ui";

export type DispatcherLoadMutationInput =
  | DispatcherCreateLoadInput
  | DispatcherEditLoadInput;

export type DispatcherLoadMutationResult = {
  loadId: string;
  pickupStopId: string | null;
  dropoffStopId: string | null;
};

export type DispatcherLoadDomainErrorCode =
  | "LOAD_NOT_FOUND"
  | "LOAD_NOT_EDITABLE_STATUS"
  | "LOAD_NOT_EDITABLE_WHILE_RESERVED"
  | "LOAD_NO_CHANGES";

export class DispatcherLoadDomainError extends Error {
  constructor(
    public code: DispatcherLoadDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DispatcherLoadDomainError";
  }
}

function toDate(value: string | undefined) {
  return value ? new Date(value) : null;
}

function nullable<T>(value: T | undefined) {
  return value ?? null;
}

function loadFields(input: DispatcherLoadMutationInput): LoadUpdate {
  return {
    loadSourceId: "loadSourceId" in input ? nullable(input.loadSourceId) : undefined,
    counterpartyId:
      "counterpartyId" in input ? nullable(input.counterpartyId) : undefined,
    referenceNumber:
      "referenceNumber" in input ? nullable(input.referenceNumber) : undefined,
    equipmentType: "equipmentType" in input ? input.equipmentType : undefined,
    cargoType: "cargoType" in input ? nullable(input.cargoType) : undefined,
    weightLbs: "weightLbs" in input ? nullable(input.weightLbs) : undefined,
    rateAmount: "rateAmount" in input ? nullable(input.rateAmount) : undefined,
    currency: "currency" in input && input.currency ? input.currency : undefined,
    distanceMiles:
      "distanceMiles" in input ? nullable(input.distanceMiles) : undefined,
    pickupStartsAt:
      "pickupStartsAt" in input ? toDate(input.pickupStartsAt) : undefined,
    pickupEndsAt:
      "pickupEndsAt" in input ? toDate(input.pickupEndsAt) : undefined,
    deliveryStartsAt:
      "deliveryStartsAt" in input ? toDate(input.deliveryStartsAt) : undefined,
    deliveryEndsAt:
      "deliveryEndsAt" in input ? toDate(input.deliveryEndsAt) : undefined,
    updatedAt: new Date(),
  };
}

function locationFields(
  organizationId: string,
  input: DispatcherLocationInput,
): LocationInsert {
  return {
    organizationId,
    label: nullable(input.label),
    city: input.city,
    state: input.state,
    postalCode: nullable(input.postalCode),
    country: input.country,
    latitude: nullable(input.latitude),
    longitude: nullable(input.longitude),
    rawPayload: { stage: "1D-B", source: dispatcherUiSourceId },
    payloadHash: [
      dispatcherUiSourceId,
      organizationId,
      input.label ?? "",
      input.city,
      input.state,
      input.postalCode ?? "",
      input.country,
    ].join(":"),
  };
}

async function resolveLocation({
  db,
  organizationId,
  input,
}: {
  db: MutationDb;
  organizationId: string;
  input: DispatcherLocationInput;
}) {
  const existing = (
    await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.organizationId, organizationId),
          input.label ? eq(locations.label, input.label) : isNull(locations.label),
          eq(locations.city, input.city),
          eq(locations.state, input.state),
          eq(locations.country, input.country),
        ),
      )
      .limit(1)
  )[0];

  if (existing) return existing;

  const inserted = (
    await db
      .insert(locations)
      .values(locationFields(organizationId, input))
      .returning()
  )[0];

  if (!inserted) throw new Error("Failed to create dispatcher load location.");
  return inserted;
}

async function upsertLoadStop({
  db,
  organizationId,
  loadId,
  locationId,
  stopType,
  sequence,
  appointmentStartsAt,
  appointmentEndsAt,
}: {
  db: MutationDb;
  organizationId: string;
  loadId: string;
  locationId: string;
  stopType: "pickup" | "dropoff";
  sequence: 1 | 2;
  appointmentStartsAt?: string;
  appointmentEndsAt?: string;
}) {
  const stop = (
    await db
      .insert(loadStops)
      .values({
        organizationId,
        loadId,
        locationId,
        stopType,
        sequence,
        appointmentStartsAt: toDate(appointmentStartsAt),
        appointmentEndsAt: toDate(appointmentEndsAt),
        rawPayload: { stage: "1D-B", source: dispatcherUiSourceId },
        payloadHash: [
          dispatcherUiSourceId,
          loadId,
          stopType,
          sequence.toString(),
          locationId,
        ].join(":"),
      })
      .onConflictDoUpdate({
        target: [loadStops.loadId, loadStops.sequence],
        set: {
          locationId,
          stopType,
          appointmentStartsAt: toDate(appointmentStartsAt),
          appointmentEndsAt: toDate(appointmentEndsAt),
          updatedAt: new Date(),
        },
      })
      .returning()
  )[0];

  if (!stop) throw new Error(`Failed to upsert ${stopType} stop.`);
  return stop;
}

async function createDispatcherLoadWithDb(
  db: MutationDb,
  input: DispatcherCreateLoadInput,
) {
  const pickupLocation = await resolveLocation({
    db,
    organizationId: input.organizationId,
    input: input.pickupLocation,
  });
  const dropoffLocation = await resolveLocation({
    db,
    organizationId: input.organizationId,
    input: input.dropoffLocation,
  });

  const load = (
    await db
      .insert(loads)
      .values({
        ...loadFields(input),
        organizationId: input.organizationId,
        sourceId: dispatcherUiSourceId,
        status: "available",
        currency: "USD",
        metadata: { stage: "1D-B", source: dispatcherUiSourceId },
      })
      .returning()
  )[0];

  if (!load) throw new Error("Failed to create dispatcher load.");

  const pickupStop = await upsertLoadStop({
    db,
    organizationId: input.organizationId,
    loadId: load.id,
    locationId: pickupLocation.id,
    stopType: "pickup",
    sequence: 1,
    appointmentStartsAt: input.pickupStartsAt,
    appointmentEndsAt: input.pickupEndsAt,
  });
  const dropoffStop = await upsertLoadStop({
    db,
    organizationId: input.organizationId,
    loadId: load.id,
    locationId: dropoffLocation.id,
    stopType: "dropoff",
    sequence: 2,
    appointmentStartsAt: input.deliveryStartsAt,
    appointmentEndsAt: input.deliveryEndsAt,
  });

  return {
    loadId: load.id,
    pickupStopId: pickupStop.id,
    dropoffStopId: dropoffStop.id,
  };
}

async function editDispatcherLoadWithDb(
  db: MutationDb,
  input: DispatcherEditLoadInput,
) {
  const existingLoad = (
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

  if (!existingLoad) {
    throw new DispatcherLoadDomainError(
      "LOAD_NOT_FOUND",
      "Load was not found for this organization.",
    );
  }

  if (existingLoad.status !== "available") {
    throw new DispatcherLoadDomainError(
      "LOAD_NOT_EDITABLE_STATUS",
      "Only available loads can be edited in Stage 1D-B.",
    );
  }

  const activeReservation = (
    await db
      .select()
      .from(loadReservations)
      .where(
        and(
          eq(loadReservations.organizationId, input.organizationId),
          eq(loadReservations.loadId, input.loadId),
          eq(loadReservations.status, "active"),
        ),
      )
      .limit(1)
  )[0];

  if (activeReservation) {
    throw new DispatcherLoadDomainError(
      "LOAD_NOT_EDITABLE_WHILE_RESERVED",
      "Load cannot be edited while it has an active reservation.",
    );
  }

  const fields = loadFields(input);
  const fieldsToSet = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as LoadUpdate;

  if (Object.keys(fieldsToSet).length <= 1) {
    throw new DispatcherLoadDomainError(
      "LOAD_NO_CHANGES",
      "No load fields were provided for edit.",
    );
  }

  const updatedLoad = (
    await db
      .update(loads)
      .set(fieldsToSet)
      .where(eq(loads.id, input.loadId))
      .returning()
  )[0];

  if (!updatedLoad) throw new Error("Failed to update dispatcher load.");

  let pickupStopId: string | null = null;
  let dropoffStopId: string | null = null;

  if (input.pickupLocation) {
    const pickupLocation = await resolveLocation({
      db,
      organizationId: input.organizationId,
      input: input.pickupLocation,
    });
    const pickupStop = await upsertLoadStop({
      db,
      organizationId: input.organizationId,
      loadId: input.loadId,
      locationId: pickupLocation.id,
      stopType: "pickup",
      sequence: 1,
      appointmentStartsAt: input.pickupStartsAt,
      appointmentEndsAt: input.pickupEndsAt,
    });
    pickupStopId = pickupStop.id;
  }

  if (input.dropoffLocation) {
    const dropoffLocation = await resolveLocation({
      db,
      organizationId: input.organizationId,
      input: input.dropoffLocation,
    });
    const dropoffStop = await upsertLoadStop({
      db,
      organizationId: input.organizationId,
      loadId: input.loadId,
      locationId: dropoffLocation.id,
      stopType: "dropoff",
      sequence: 2,
      appointmentStartsAt: input.deliveryStartsAt,
      appointmentEndsAt: input.deliveryEndsAt,
    });
    dropoffStopId = dropoffStop.id;
  }

  return {
    loadId: updatedLoad.id,
    pickupStopId,
    dropoffStopId,
  };
}

export async function createDispatcherLoad(
  input: DispatcherCreateLoadInput,
  db: Db = getDb(),
): Promise<DispatcherLoadMutationResult> {
  return db.transaction((tx) => createDispatcherLoadWithDb(tx, input));
}

export async function editDispatcherLoad(
  input: DispatcherEditLoadInput,
  db: Db = getDb(),
): Promise<DispatcherLoadMutationResult> {
  return db.transaction((tx) => editDispatcherLoadWithDb(tx, input));
}
