export const ALLOWED_CONTEXT_FACTS = {
  driver: {
    cooperation_tier: ["regular", "friendly"],

    us_citizen: ["true", "false", "unknown"],

    card: ["true", "false", "unknown"],

    escort_required_for_access: ["true", "false", "unknown"],

    preferred_fuel_network: ["Pilot", "Loves", "TA", "Petro", "unknown"],
  },

  organization: {
    preferred_fuel_network: ["Pilot", "Loves", "TA", "Petro", "unknown"],
  },

  load: {
    declared_load_type: ["full", "partial", "unknown"],
  },

  load_stop: {
    access_sensitive: ["true", "false", "unknown"],
  },
} as const;

export type DispatcherContextEntityType = keyof typeof ALLOWED_CONTEXT_FACTS;

export type DispatcherContextFactsMap = typeof ALLOWED_CONTEXT_FACTS;

export function isAllowedContextEntityType(
  entityType: string,
): entityType is DispatcherContextEntityType {
  return entityType in ALLOWED_CONTEXT_FACTS;
}

export function isAllowedContextKey(
  entityType: DispatcherContextEntityType,
  contextKey: string,
): boolean {
  return contextKey in ALLOWED_CONTEXT_FACTS[entityType];
}

export function isAllowedContextValue(
  entityType: DispatcherContextEntityType,
  contextKey: string,
  contextValue: string,
): boolean {
  if (!isAllowedContextKey(entityType, contextKey)) {
    return false;
  }

  const allowedValuesByKey = ALLOWED_CONTEXT_FACTS[entityType] as Record<
    string,
    readonly string[]
  >;

  const allowedValues = allowedValuesByKey[contextKey];

  return allowedValues.includes(contextValue);
}

export interface ValidateDispatcherContextFactInput {
  entityType: string;
  contextKey: string;
  contextValue: string;
}

export function validateDispatcherContextFactInput(
  input: ValidateDispatcherContextFactInput,
): void {
  const { entityType, contextKey, contextValue } = input;

  if (!isAllowedContextEntityType(entityType)) {
    throw new Error(`Unsupported context entity type: ${entityType}`);
  }

  if (!isAllowedContextKey(entityType, contextKey)) {
    throw new Error(
      `Unsupported context key "${contextKey}" for entity type "${entityType}"`,
    );
  }

  if (!isAllowedContextValue(entityType, contextKey, contextValue)) {
    throw new Error(
      `Unsupported context value "${contextValue}" for "${entityType}.${contextKey}"`,
    );
  }
}
