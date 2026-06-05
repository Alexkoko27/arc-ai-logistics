"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dispatcherActionFailure,
  dispatcherActionSuccess,
  type DispatcherMutationActionResult,
} from "@/lib/dispatch/actionResult";
import {
  DispatcherLoadDomainError,
  createDispatcherLoad,
  editDispatcherLoad,
} from "@/lib/dispatch/loadService";
import {
  DispatcherMutationBlockedError,
  assertDispatcherMutationAllowed,
} from "@/lib/dispatch/mutationGuard";
import {
  ActiveLoadReservationConflictError,
  DispatcherReservationDomainError,
  releaseLoadReservation,
  reserveLoad,
} from "@/lib/dispatch/reservationService";
import {
  DispatcherVehicleDomainError,
  createDispatcherVehicle,
  editDispatcherVehicle,
} from "@/lib/dispatch/vehicleService";
import {
  dispatcherCreateLoadSchema,
  dispatcherCreateVehicleSchema,
  dispatcherEditLoadSchema,
  dispatcherEditVehicleSchema,
  dispatcherReleaseReservationSchema,
  dispatcherReserveLoadSchema,
} from "@/lib/dispatch/validation";

function validationFailure(error: z.ZodError): DispatcherMutationActionResult {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  );

  return dispatcherActionFailure({
    code: "VALIDATION_ERROR",
    message: "Dispatcher mutation input is invalid.",
    fieldErrors,
  });
}

function loadMutationFailure(error: unknown): DispatcherMutationActionResult {
  if (error instanceof DispatcherMutationBlockedError) {
    return dispatcherActionFailure({
      code: "DISPATCHER_MUTATION_BLOCKED",
      message: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    return validationFailure(error);
  }

  if (error instanceof DispatcherLoadDomainError) {
    return dispatcherActionFailure({
      code: error.code,
      message: error.message,
    });
  }

  return dispatcherActionFailure({
    code: "UNKNOWN_ERROR",
    message: "Dispatcher load mutation failed.",
  });
}

function vehicleMutationFailure(error: unknown): DispatcherMutationActionResult {
  if (error instanceof DispatcherMutationBlockedError) {
    return dispatcherActionFailure({
      code: "DISPATCHER_MUTATION_BLOCKED",
      message: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    return validationFailure(error);
  }

  if (error instanceof DispatcherVehicleDomainError) {
    return dispatcherActionFailure({
      code: error.code,
      message: error.message,
    });
  }

  return dispatcherActionFailure({
    code: "UNKNOWN_ERROR",
    message: "Dispatcher vehicle mutation failed.",
  });
}

function reservationMutationFailure(error: unknown): DispatcherMutationActionResult {
  if (error instanceof DispatcherMutationBlockedError) {
    return dispatcherActionFailure({
      code: "DISPATCHER_MUTATION_BLOCKED",
      message: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    return validationFailure(error);
  }

  if (error instanceof ActiveLoadReservationConflictError) {
    return dispatcherActionFailure({
      code: "LOAD_RESERVATION_CONFLICT",
      message: error.message,
    });
  }

  if (error instanceof DispatcherReservationDomainError) {
    return dispatcherActionFailure({
      code: error.code,
      message: error.message,
    });
  }

  return dispatcherActionFailure({
    code: "UNKNOWN_ERROR",
    message: "Dispatcher reservation mutation failed.",
  });
}

export async function createDispatcherLoadAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("create dispatcher load");
    const parsedInput = dispatcherCreateLoadSchema.parse(input);
    const result = await createDispatcherLoad(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Load ${result.loadId} created.`);
  } catch (error) {
    return loadMutationFailure(error);
  }
}

export async function editDispatcherLoadAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("edit dispatcher load");
    const parsedInput = dispatcherEditLoadSchema.parse(input);
    const result = await editDispatcherLoad(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Load ${result.loadId} updated.`);
  } catch (error) {
    return loadMutationFailure(error);
  }
}

export async function createDispatcherVehicleAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("create dispatcher vehicle");
    const parsedInput = dispatcherCreateVehicleSchema.parse(input);
    const result = await createDispatcherVehicle(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Vehicle ${result.vehicleId} created.`);
  } catch (error) {
    return vehicleMutationFailure(error);
  }
}

export async function editDispatcherVehicleAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("edit dispatcher vehicle");
    const parsedInput = dispatcherEditVehicleSchema.parse(input);
    const result = await editDispatcherVehicle(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Vehicle ${result.vehicleId} updated.`);
  } catch (error) {
    return vehicleMutationFailure(error);
  }
}

export async function reserveDispatcherLoadAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("reserve dispatcher load");
    const parsedInput = dispatcherReserveLoadSchema.parse(input);
    const reservation = await reserveLoad(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Reservation ${reservation.id} created.`);
  } catch (error) {
    return reservationMutationFailure(error);
  }
}

export async function releaseDispatcherReservationAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  try {
    assertDispatcherMutationAllowed("release dispatcher reservation");
    const parsedInput = dispatcherReleaseReservationSchema.parse(input);
    const reservation = await releaseLoadReservation(parsedInput);
    revalidatePath("/dispatcher");

    return dispatcherActionSuccess(`Reservation ${reservation.id} released.`);
  } catch (error) {
    return reservationMutationFailure(error);
  }
}
