import { and, asc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { dispatcherContextFacts } from "../db/schema";
import {
  type DispatcherContextEntityType,
  isAllowedContextEntityType,
  validateDispatcherContextFactInput,
} from "./dispatcherContextFacts";
import {
  DISPATCHER_CONTEXT_FACT_SOURCE_TYPES,
  type DispatcherContextFactSourceType,
} from "./contextFactService";

type Db = ReturnType<typeof getDb>;

export type DispatcherContextFactReadFilters = {
  entityType?: DispatcherContextEntityType;
  sourceType?: DispatcherContextFactSourceType;
};

export type DispatcherContextFactEntityReadInput = {
  organizationId: string;
  entityType: DispatcherContextEntityType;
  entityId: string;
};

export type DispatcherContextFactOrganizationReadInput = {
  organizationId: string;
  filters?: DispatcherContextFactReadFilters;
};

function assertAllowedPlanningSourceType(sourceType: DispatcherContextFactSourceType) {
  if (!DISPATCHER_CONTEXT_FACT_SOURCE_TYPES.includes(sourceType)) {
    throw new Error(`Unsupported context fact source type: ${sourceType}`);
  }
}

function assertPlanningVisibleFactShape(fact: {
  entityType: string;
  contextKey: string;
  contextValue: string;
}) {
  if (!isAllowedContextEntityType(fact.entityType)) {
    return false;
  }

  try {
    validateDispatcherContextFactInput({
      entityType: fact.entityType,
      contextKey: fact.contextKey,
      contextValue: fact.contextValue,
    });

    return true;
  } catch {
    return false;
  }
}

export async function getDispatcherContextFactsForEntity(
  input: DispatcherContextFactEntityReadInput,
  db: Db = getDb(),
) {
  return db
    .select()
    .from(dispatcherContextFacts)
    .where(
      and(
        eq(dispatcherContextFacts.organizationId, input.organizationId),
        eq(dispatcherContextFacts.entityType, input.entityType),
        eq(dispatcherContextFacts.entityId, input.entityId),
      ),
    )
    .orderBy(
      asc(dispatcherContextFacts.entityType),
      asc(dispatcherContextFacts.contextKey),
      asc(dispatcherContextFacts.createdAt),
    );
}

export async function getDispatcherContextFactsForOrganization(
  input: DispatcherContextFactOrganizationReadInput,
  db: Db = getDb(),
) {
  const filters = input.filters ?? {};

  if (filters.sourceType) {
    assertAllowedPlanningSourceType(filters.sourceType);
  }

  const conditions = [eq(dispatcherContextFacts.organizationId, input.organizationId)];

  if (filters.entityType) {
    conditions.push(eq(dispatcherContextFacts.entityType, filters.entityType));
  }

  if (filters.sourceType) {
    conditions.push(eq(dispatcherContextFacts.sourceType, filters.sourceType));
  }

  return db
    .select()
    .from(dispatcherContextFacts)
    .where(and(...conditions))
    .orderBy(
      asc(dispatcherContextFacts.entityType),
      asc(dispatcherContextFacts.entityId),
      asc(dispatcherContextFacts.contextKey),
      asc(dispatcherContextFacts.createdAt),
    );
}

export async function getPlanningVisibleContextFacts(
  input: DispatcherContextFactOrganizationReadInput,
  db: Db = getDb(),
) {
  const facts = await getDispatcherContextFactsForOrganization(input, db);

  return facts.filter(assertPlanningVisibleFactShape);
}
