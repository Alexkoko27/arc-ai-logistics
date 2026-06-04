import type {
  DispatcherCreateVehicleInput,
  DispatcherEditVehicleInput,
} from "./validation";

export type DispatcherVehicleMutationInput =
  | DispatcherCreateVehicleInput
  | DispatcherEditVehicleInput;

export function describeVehicleMutationBoundary(
  input: DispatcherVehicleMutationInput,
) {
  return {
    domain: "Vehicle",
    organizationId: input.organizationId,
    stage: "1D-A",
    persistenceImplemented: false,
  };
}
