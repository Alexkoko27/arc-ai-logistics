export type DispatcherMutationErrorCode =
  | "VALIDATION_ERROR"
  | "DISPATCHER_MUTATION_BLOCKED"
  | "STAGE_1D_A_FOUNDATION_ONLY"
  | "UNKNOWN_ERROR";

export type DispatcherMutationActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  code?: DispatcherMutationErrorCode;
};

export function dispatcherActionSuccess(
  message: string,
): DispatcherMutationActionResult {
  return {
    success: true,
    message,
  };
}

export function dispatcherActionFailure({
  message,
  code,
  fieldErrors,
}: {
  message: string;
  code: DispatcherMutationErrorCode;
  fieldErrors?: Record<string, string[]>;
}): DispatcherMutationActionResult {
  return {
    success: false,
    message,
    code,
    fieldErrors,
  };
}
