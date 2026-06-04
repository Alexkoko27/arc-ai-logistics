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
  describeVehicleMutationBoundary,
} from "@/lib/dispatch/vehicleService";
import {
  dispatcherCreateLoadSchema,
  dispatcherCreateVehicleSchema,
  dispatcherEditLoadSchema,
  dispatcherEditVehicleSchema,
  dispatcherReleaseReservationSchema,
  dispatcherReserveLoadSchema,
} from "@/lib/dispatch/validation";
import {
  describeWorkflowMutationBoundary,
} from "@/lib/dispatch/workflowService";

function foundationOnlyResult(
  message: string,
): DispatcherMutationActionResult {
  return dispatcherActionFailure({
    code: "STAGE_1D_A_FOUNDATION_ONLY",
    message,
  });
}

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

function guardedAction<TInput>({
  context,
  input,
  schema,
  describeBoundary,
  foundationMessage,
}: {
  context: string;
  input: unknown;
  schema: z.ZodType<TInput>;
  describeBoundary: (input: TInput) => unknown;
  foundationMessage: string;
}): DispatcherMutationActionResult {
  try {
    assertDispatcherMutationAllowed(context);

    const parsedInput = schema.parse(input);
    describeBoundary(parsedInput);

    return foundationOnlyResult(foundationMessage);
  } catch (error) {
    if (error instanceof DispatcherMutationBlockedError) {
      return dispatcherActionFailure({
        code: "DISPATCHER_MUTATION_BLOCKED",
        message: error.message,
      });
    }

    if (error instanceof z.ZodError) {
      return validationFailure(error);
    }

    return dispatcherActionFailure({
      code: "UNKNOWN_ERROR",
      message: "Dispatcher mutation failed before persistence.",
    });
  }
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
  return guardedAction({
    context: "create dispatcher vehicle",
    input,
    schema: dispatcherCreateVehicleSchema,
    describeBoundary: describeVehicleMutationBoundary,
    foundationMessage:
      "Vehicle creation is validated but not persisted in Stage 1D-A.",
  });
}

export async function editDispatcherVehicleAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  return guardedAction({
    context: "edit dispatcher vehicle",
    input,
    schema: dispatcherEditVehicleSchema,
    describeBoundary: describeVehicleMutationBoundary,
    foundationMessage:
      "Vehicle editing is validated but not persisted in Stage 1D-A.",
  });
}

export async function reserveDispatcherLoadAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  return guardedAction({
    context: "reserve dispatcher load",
    input,
    schema: dispatcherReserveLoadSchema,
    describeBoundary: describeWorkflowMutationBoundary,
    foundationMessage:
      "Load reservation is validated but not executed in Stage 1D-A.",
  });
}

export async function releaseDispatcherReservationAction(
  input: unknown,
): Promise<DispatcherMutationActionResult> {
  return guardedAction({
    context: "release dispatcher reservation",
    input,
    schema: dispatcherReleaseReservationSchema,
    describeBoundary: describeWorkflowMutationBoundary,
    foundationMessage:
      "Reservation release is validated but not executed in Stage 1D-A.",
  });
}
