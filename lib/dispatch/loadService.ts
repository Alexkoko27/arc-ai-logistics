import type {
  DispatcherCreateLoadInput,
  DispatcherEditLoadInput,
} from "./validation";

export type DispatcherLoadMutationInput =
  | DispatcherCreateLoadInput
  | DispatcherEditLoadInput;

export function describeLoadMutationBoundary(input: DispatcherLoadMutationInput) {
  return {
    domain: "Load",
    organizationId: input.organizationId,
    stage: "1D-A",
    persistenceImplemented: false,
  };
}
