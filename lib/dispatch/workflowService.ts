import type {
  DispatcherReleaseReservationInput,
  DispatcherReserveLoadInput,
} from "./validation";

export type DispatcherWorkflowMutationInput =
  | DispatcherReserveLoadInput
  | DispatcherReleaseReservationInput;

export function describeWorkflowMutationBoundary(
  input: DispatcherWorkflowMutationInput,
) {
  return {
    domain: "LoadReservation",
    organizationId: input.organizationId,
    stage: "1D-A",
    persistenceImplemented: false,
  };
}
