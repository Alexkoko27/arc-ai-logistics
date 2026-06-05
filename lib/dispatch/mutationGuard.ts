import { assertDevDispatcherDatabaseTarget } from "./devDatabaseGuard";

export class DispatcherMutationBlockedError extends Error {
  code = "DISPATCHER_MUTATION_BLOCKED";

  constructor(message: string) {
    super(message);
    this.name = "DispatcherMutationBlockedError";
  }
}

export function getDispatcherMutationRuntime() {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };
}

export function assertDispatcherMutationAllowed(context = "dispatcher mutation") {
  const { nodeEnv, vercelEnv } = getDispatcherMutationRuntime();
  const isProductionVercel = vercelEnv === "production";
  const isProductionRuntime =
    nodeEnv === "production" && vercelEnv !== "preview";

  if (isProductionVercel || isProductionRuntime) {
    throw new DispatcherMutationBlockedError(
      `${context} is blocked in production runtime.`,
    );
  }

  try {
    assertDevDispatcherDatabaseTarget(context);
  } catch (error) {
    throw new DispatcherMutationBlockedError(
      error instanceof Error
        ? error.message
        : `${context} requires a dispatcher-safe database target.`,
    );
  }
}
