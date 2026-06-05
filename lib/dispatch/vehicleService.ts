import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { vehicles } from "../db/schema";
import { assertDevDispatcherDatabaseTarget } from "./devDatabaseGuard";
import type {
  DispatcherCreateVehicleInput,
  DispatcherEditVehicleInput,
} from "./validation";

type Db = ReturnType<typeof getDb>;
type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type MutationDb = Db | TransactionDb;
type VehicleInsert = typeof vehicles.$inferInsert;
type VehicleUpdate = Partial<VehicleInsert>;
type VehicleRow = typeof vehicles.$inferSelect;
type DateInput = string | Date | null | undefined;

const dispatcherUiSourceId = "dispatcher-ui";

export type DispatcherVehicleMutationInput =
  | DispatcherCreateVehicleInput
  | DispatcherEditVehicleInput;

export type DispatcherVehicleMutationResult = {
  vehicleId: string;
};

export type DispatcherVehicleDomainErrorCode =
  | "VEHICLE_NOT_FOUND"
  | "VEHICLE_NO_CHANGES"
  | "VEHICLE_DUPLICATE_UNIT_NUMBER";

export class DispatcherVehicleDomainError extends Error {
  constructor(
    public code: DispatcherVehicleDomainErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "DispatcherVehicleDomainError";
  }
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

function vehicleFields(
  input: DispatcherVehicleMutationInput,
): VehicleUpdate {
  return {
    unitNumber: "unitNumber" in input ? input.unitNumber : undefined,
    vin: "vin" in input ? nullable(input.vin) : undefined,
    equipmentType:
      "equipmentType" in input ? input.equipmentType : undefined,
    status: "status" in input ? input.status : undefined,
    expectedAvailableAt:
      "expectedAvailableAt" in input ? toDate(input.expectedAvailableAt) : undefined,
    updatedAt: new Date(),
  };
}

function vehicleFieldChanged(
  existingVehicle: VehicleRow,
  key: string,
  value: VehicleUpdate[keyof VehicleUpdate],
) {
  if (key === "expectedAvailableAt") {
    return !datesEqual(existingVehicle.expectedAvailableAt, value as DateInput);
  }

  return !nullableEqual(
    existingVehicle[key as keyof VehicleRow],
    value,
  );
}

function isDuplicateUnitNumberConflict(error: unknown) {
  let currentError = error;

  while (currentError && typeof currentError === "object") {
    const record = currentError as Record<string, unknown>;
    const code = record.code;
    const constraint = record.constraint ?? record.constraint_name;
    const message = record.message;

    if (
      code === "23505" ||
      constraint === "vehicles_org_unit_number_idx" ||
      (typeof message === "string" &&
        message.includes("vehicles_org_unit_number_idx"))
    ) {
      return true;
    }

    currentError = record.cause;
  }

  return false;
}

function duplicateUnitNumberError(error: unknown) {
  return new DispatcherVehicleDomainError(
    "VEHICLE_DUPLICATE_UNIT_NUMBER",
    "Vehicle unit number already exists for this organization.",
    { cause: error },
  );
}

async function createDispatcherVehicleWithDb(
  db: MutationDb,
  input: DispatcherCreateVehicleInput,
) {
  const vehicle = (
    await db
      .insert(vehicles)
      .values({
        organizationId: input.organizationId,
        unitNumber: input.unitNumber,
        vin: input.vin ?? null,
        equipmentType: input.equipmentType,
        status: input.status,
        expectedAvailableAt: toDate(input.expectedAvailableAt),
        metadata: { stage: "1D-C", source: dispatcherUiSourceId },
      })
      .returning()
  )[0];

  if (!vehicle) throw new Error("Failed to create dispatcher vehicle.");

  return { vehicleId: vehicle.id };
}

async function editDispatcherVehicleWithDb(
  db: MutationDb,
  input: DispatcherEditVehicleInput,
) {
  const existingVehicle = (
    await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, input.vehicleId),
          eq(vehicles.organizationId, input.organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (!existingVehicle) {
    throw new DispatcherVehicleDomainError(
      "VEHICLE_NOT_FOUND",
      "Vehicle was not found for this organization.",
    );
  }

  const fields = vehicleFields(input);
  const fieldsToSet = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as VehicleUpdate;
  const vehicleHasChanges = Object.entries(fieldsToSet).some(
    ([key, value]) =>
      key !== "updatedAt" && vehicleFieldChanged(existingVehicle, key, value),
  );

  if (!vehicleHasChanges) {
    throw new DispatcherVehicleDomainError(
      "VEHICLE_NO_CHANGES",
      "No semantic vehicle changes were provided for edit.",
    );
  }

  const updatedVehicle = (
    await db
      .update(vehicles)
      .set(fieldsToSet)
      .where(
        and(
          eq(vehicles.id, input.vehicleId),
          eq(vehicles.organizationId, input.organizationId),
        ),
      )
      .returning()
  )[0];

  if (!updatedVehicle) {
    throw new DispatcherVehicleDomainError(
      "VEHICLE_NOT_FOUND",
      "Vehicle was not found for this organization.",
    );
  }

  return { vehicleId: updatedVehicle.id };
}

export async function createDispatcherVehicle(
  input: DispatcherCreateVehicleInput,
  db: Db = getDb(),
): Promise<DispatcherVehicleMutationResult> {
  assertDevDispatcherDatabaseTarget("create dispatcher vehicle");

  try {
    return await db.transaction((tx) => createDispatcherVehicleWithDb(tx, input));
  } catch (error) {
    if (isDuplicateUnitNumberConflict(error)) {
      throw duplicateUnitNumberError(error);
    }

    throw error;
  }
}

export async function editDispatcherVehicle(
  input: DispatcherEditVehicleInput,
  db: Db = getDb(),
): Promise<DispatcherVehicleMutationResult> {
  assertDevDispatcherDatabaseTarget("edit dispatcher vehicle");

  try {
    return await db.transaction((tx) => editDispatcherVehicleWithDb(tx, input));
  } catch (error) {
    if (isDuplicateUnitNumberConflict(error)) {
      throw duplicateUnitNumberError(error);
    }

    throw error;
  }
}
