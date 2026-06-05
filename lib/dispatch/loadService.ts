import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  loadReservations,
  loadStops,
  loads,
  locations,
} from "../db/schema";
import { assertDevDispatcherDatabaseTarget } from "./devDatabaseGuard";
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
type LoadRow = typeof loads.$inferSelect;
type LoadStopRow = typeof loadStops.$inferSelect;
type LocationInsert = typeof locations.$inferInsert;
type DateInput = string | Date | null | undefined;

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
  | "LOAD_NO_CHANGES"
  | "LOAD_INVALID_TIMING";

export class DispatcherLoadDomainError extends Error {
  constructor(
    public code: DispatcherLoadDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DispatcherLoadDomainError";
  }
}

function hasOwn(input: object, key: keyof DispatcherLoadMutationInput) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function toDate(value: DateInput) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function nullable<T>(value: T | undefined) {
  return value ?? null;
}

function datesEqual(left: DateInput, right: DateInput) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (!leftDate && !rightDate) return true;
  if (!leftDate || !rightDate) return false;
  return leftDate.getTime() === rightDate.getTime();
}

function nullableEqual(left: unknown, right: unknown) {
  return (left ?? null) === (right ?? null);
}

function decimalEqual(left: string | null, right: string | null | undefined) {
  if (!left && !right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber === rightNumber;
  }
  return (left ?? null) === (right ?? null);
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

function loadFieldChanged(
  existingLoad: LoadRow,
  key: string,
  value: LoadUpdate[keyof LoadUpdate],
) {
  if (key === "pickupStartsAt") return !datesEqual(existingLoad.pickupStartsAt, value as DateInput);
  if (key === "pickupEndsAt") return !datesEqual(existingLoad.pickupEndsAt, value as DateInput);
  if (key === "deliveryStartsAt") return !datesEqual(existingLoad.deliveryStartsAt, value as DateInput);
  if (key === "deliveryEndsAt") return !datesEqual(existingLoad.deliveryEndsAt, value as DateInput);
  if (key === "rateAmount") return !decimalEqual(existingLoad.rateAmount, value as string | null);
  if (key === "distanceMiles") {
    return !decimalEqual(existingLoad.distanceMiles, value as string | null);
  }

  return !nullableEqual(
    existingLoad[key as keyof LoadRow],
    value,
  );
}

function effectiveDate(
  input: DispatcherEditLoadInput,
  key:
    | "pickupStartsAt"
    | "pickupEndsAt"
    | "deliveryStartsAt"
    | "deliveryEndsAt",
  fallback: Date | null,
) {
  return hasOwn(input, key) ? toDate(input[key]) : fallback;
}

function assertEffectiveLoadTiming(
  existingLoad: LoadRow,
  input: DispatcherEditLoadInput,
) {
  const pickupStartsAt = effectiveDate(
    input,
    "pickupStartsAt",
    existingLoad.pickupStartsAt,
  );
  const pickupEndsAt = effectiveDate(
    input,
    "pickupEndsAt",
    existingLoad.pickupEndsAt,
  );
  const deliveryStartsAt = effectiveDate(
    input,
    "deliveryStartsAt",
    existingLoad.deliveryStartsAt,
  );
  const deliveryEndsAt = effectiveDate(
    input,
    "deliveryEndsAt",
    existingLoad.deliveryEndsAt,
  );

  if (pickupStartsAt && pickupEndsAt && pickupStartsAt > pickupEndsAt) {
    throw new DispatcherLoadDomainError(
      "LOAD_INVALID_TIMING",
      "Pickup end must be after pickup start.",
    );
  }

  if (deliveryStartsAt && deliveryEndsAt && deliveryStartsAt > deliveryEndsAt) {
    throw new DispatcherLoadDomainError(
      "LOAD_INVALID_TIMING",
      "Delivery end must be after delivery start.",
    );
  }

  if (pickupEndsAt && deliveryStartsAt && pickupEndsAt > deliveryStartsAt) {
    throw new DispatcherLoadDomainError(
      "LOAD_INVALID_TIMING",
      "Delivery must start after pickup is complete.",
    );
  }
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
  appointmentStartsAt?: DateInput;
  appointmentEndsAt?: DateInput;
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

async function lockLoadReservationWriteBoundary(db: MutationDb) {
  await db.execute(sql`lock table load_reservations in share row exclusive mode`);
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

function activeReservationPredicate(organizationId: string, loadId: string) {
  return sql`not exists (
    select 1
    from load_reservations
    where organization_id = ${organizationId}
      and load_id = ${loadId}
      and status = 'active'
  )`;
}

async function getActiveReservation(db: MutationDb, organizationId: string, loadId: string) {
  return (
    await db
      .select()
      .from(loadReservations)
      .where(
        and(
          eq(loadReservations.organizationId, organizationId),
          eq(loadReservations.loadId, loadId),
          eq(loadReservations.status, "active"),
        ),
      )
      .limit(1)
  )[0];
}

type StopSyncPlan = {
  changed: boolean;
  locationId: string;
  appointmentStartsAt: Date | null;
  appointmentEndsAt: Date | null;
  stopType: "pickup" | "dropoff";
  sequence: 1 | 2;
};

async function buildStopSyncPlan({
  db,
  organizationId,
  input,
  existingStop,
  locationInput,
  startKey,
  endKey,
  loadStart,
  loadEnd,
  stopType,
  sequence,
}: {
  db: MutationDb;
  organizationId: string;
  input: DispatcherEditLoadInput;
  existingStop: LoadStopRow | undefined;
  locationInput: DispatcherLocationInput | undefined;
  startKey: "pickupStartsAt" | "deliveryStartsAt";
  endKey: "pickupEndsAt" | "deliveryEndsAt";
  loadStart: Date | null;
  loadEnd: Date | null;
  stopType: "pickup" | "dropoff";
  sequence: 1 | 2;
}): Promise<StopSyncPlan | null> {
  const shouldSync =
    Boolean(locationInput) || hasOwn(input, startKey) || hasOwn(input, endKey);

  if (!shouldSync) return null;

  const resolvedLocation = locationInput
    ? await resolveLocation({ db, organizationId, input: locationInput })
    : null;
  const locationId = resolvedLocation?.id ?? existingStop?.locationId;

  if (!locationId) {
    throw new Error(`Cannot synchronize ${stopType} stop without a location.`);
  }

  const appointmentStartsAt = hasOwn(input, startKey)
    ? toDate(input[startKey])
    : (existingStop?.appointmentStartsAt ?? loadStart);
  const appointmentEndsAt = hasOwn(input, endKey)
    ? toDate(input[endKey])
    : (existingStop?.appointmentEndsAt ?? loadEnd);
  const changed =
    !existingStop ||
    existingStop.locationId !== locationId ||
    existingStop.stopType !== stopType ||
    existingStop.sequence !== sequence ||
    !datesEqual(existingStop.appointmentStartsAt, appointmentStartsAt) ||
    !datesEqual(existingStop.appointmentEndsAt, appointmentEndsAt);

  return {
    changed,
    locationId,
    appointmentStartsAt,
    appointmentEndsAt,
    stopType,
    sequence,
  };
}

async function editDispatcherLoadWithDb(
  db: MutationDb,
  input: DispatcherEditLoadInput,
) {
  await lockLoadReservationWriteBoundary(db);

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

  const activeReservation = await getActiveReservation(
    db,
    input.organizationId,
    input.loadId,
  );

  if (activeReservation) {
    throw new DispatcherLoadDomainError(
      "LOAD_NOT_EDITABLE_WHILE_RESERVED",
      "Load cannot be edited while it has an active reservation.",
    );
  }

  assertEffectiveLoadTiming(existingLoad, input);

  const existingStops = await db
    .select()
    .from(loadStops)
    .where(
      and(
        eq(loadStops.organizationId, input.organizationId),
        eq(loadStops.loadId, input.loadId),
      ),
    );
  const existingPickupStop = existingStops.find((stop) => stop.sequence === 1);
  const existingDropoffStop = existingStops.find((stop) => stop.sequence === 2);

  const fields = loadFields(input);
  const fieldsToSet = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as LoadUpdate;
  const loadHasChanges = Object.entries(fieldsToSet).some(
    ([key, value]) => key !== "updatedAt" && loadFieldChanged(existingLoad, key, value),
  );
  const pickupStopPlan = await buildStopSyncPlan({
    db,
    organizationId: input.organizationId,
    input,
    existingStop: existingPickupStop,
    locationInput: input.pickupLocation,
    startKey: "pickupStartsAt",
    endKey: "pickupEndsAt",
    loadStart: existingLoad.pickupStartsAt,
    loadEnd: existingLoad.pickupEndsAt,
    stopType: "pickup",
    sequence: 1,
  });
  const dropoffStopPlan = await buildStopSyncPlan({
    db,
    organizationId: input.organizationId,
    input,
    existingStop: existingDropoffStop,
    locationInput: input.dropoffLocation,
    startKey: "deliveryStartsAt",
    endKey: "deliveryEndsAt",
    loadStart: existingLoad.deliveryStartsAt,
    loadEnd: existingLoad.deliveryEndsAt,
    stopType: "dropoff",
    sequence: 2,
  });

  if (!loadHasChanges && !pickupStopPlan?.changed && !dropoffStopPlan?.changed) {
    throw new DispatcherLoadDomainError(
      "LOAD_NO_CHANGES",
      "No semantic load changes were provided for edit.",
    );
  }

  let pickupStopId: string | null = null;
  let dropoffStopId: string | null = null;

  if (pickupStopPlan?.changed) {
    const pickupStop = await upsertLoadStop({
      db,
      organizationId: input.organizationId,
      loadId: input.loadId,
      locationId: pickupStopPlan.locationId,
      stopType: pickupStopPlan.stopType,
      sequence: pickupStopPlan.sequence,
      appointmentStartsAt: pickupStopPlan.appointmentStartsAt,
      appointmentEndsAt: pickupStopPlan.appointmentEndsAt,
    });
    pickupStopId = pickupStop.id;
  }

  if (dropoffStopPlan?.changed) {
    const dropoffStop = await upsertLoadStop({
      db,
      organizationId: input.organizationId,
      loadId: input.loadId,
      locationId: dropoffStopPlan.locationId,
      stopType: dropoffStopPlan.stopType,
      sequence: dropoffStopPlan.sequence,
      appointmentStartsAt: dropoffStopPlan.appointmentStartsAt,
      appointmentEndsAt: dropoffStopPlan.appointmentEndsAt,
    });
    dropoffStopId = dropoffStop.id;
  }

  const updatedLoad = (
    await db
      .update(loads)
      .set(fieldsToSet)
      .where(
        and(
          eq(loads.id, input.loadId),
          eq(loads.organizationId, input.organizationId),
          eq(loads.status, "available"),
          activeReservationPredicate(input.organizationId, input.loadId),
        ),
      )
      .returning()
  )[0];

  if (!updatedLoad) {
    const latestReservation = await getActiveReservation(
      db,
      input.organizationId,
      input.loadId,
    );

    if (latestReservation) {
      throw new DispatcherLoadDomainError(
        "LOAD_NOT_EDITABLE_WHILE_RESERVED",
        "Load cannot be edited while it has an active reservation.",
      );
    }

    throw new DispatcherLoadDomainError(
      "LOAD_NOT_EDITABLE_STATUS",
      "Only available loads can be edited in Stage 1D-B.",
    );
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
  assertDevDispatcherDatabaseTarget("create dispatcher load");

  return db.transaction((tx) => createDispatcherLoadWithDb(tx, input));
}

export async function editDispatcherLoad(
  input: DispatcherEditLoadInput,
  db: Db = getDb(),
): Promise<DispatcherLoadMutationResult> {
  assertDevDispatcherDatabaseTarget("edit dispatcher load");

  return db.transaction((tx) => editDispatcherLoadWithDb(tx, input));
}
