import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  dispatcherContextFacts,
  drivers,
  loads,
  loadStops,
  organizations,
} from "../db/schema";
import { validateDispatcherContextFactInput } from "./dispatcherContextFacts";

type Db = ReturnType<typeof getDb>;
type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type MutationDb = Db | TransactionDb;

export const DISPATCHER_CONTEXT_FACT_SOURCE_TYPES = [
  "dispatcher_entered",
  "imported",
  "system_inferred",
  "ai_surfaced",
] as const;

export type DispatcherContextFactSourceType =
  (typeof DISPATCHER_CONTEXT_FACT_SOURCE_TYPES)[number];

export type UpsertDispatcherContextFactInput = {
  organizationId: string;
  entityType: string;
  entityId: string;
  contextKey: string;
  contextValue: string;
  sourceType?: DispatcherContextFactSourceType;
  confidence?: string;
  sourceNote?: string;
  createdByUserId?: string;
};

export class DispatcherContextFactDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatcherContextFactDomainError";
  }
}

function assertAllowedSourceType(sourceType: string) {
  if (
    !DISPATCHER_CONTEXT_FACT_SOURCE_TYPES.includes(
      sourceType as DispatcherContextFactSourceType,
    )
  ) {
    throw new DispatcherContextFactDomainError(
      `Unsupported context fact source type: ${sourceType}`,
    );
  }
}

function normalizeConfidence(confidence: string | undefined) {
  const value = confidence ?? "1";
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new DispatcherContextFactDomainError(
      "Context fact confidence must be between 0 and 1.",
    );
  }

  return value;
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function assertContextFactEntityBelongsToOrganization(
  input: Pick<
    UpsertDispatcherContextFactInput,
    "organizationId" | "entityType" | "entityId"
  >,
  db: MutationDb,
) {
  if (input.entityType === "organization") {
    if (input.entityId !== input.organizationId) {
      throw new DispatcherContextFactDomainError(
        "Organization context fact entity must match organizationId.",
      );
    }

    const existingOrganization = (
      await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1)
    )[0];

    if (!existingOrganization) {
      throw new DispatcherContextFactDomainError(
        "Context fact organization does not exist.",
      );
    }

    return;
  }

  if (input.entityType === "driver") {
    const existingDriver = (
      await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(
          and(
            eq(drivers.id, input.entityId),
            eq(drivers.organizationId, input.organizationId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingDriver) {
      throw new DispatcherContextFactDomainError(
        "Context fact driver does not exist in this organization.",
      );
    }

    return;
  }

  if (input.entityType === "load") {
    const existingLoad = (
      await db
        .select({ id: loads.id })
        .from(loads)
        .where(
          and(
            eq(loads.id, input.entityId),
            eq(loads.organizationId, input.organizationId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingLoad) {
      throw new DispatcherContextFactDomainError(
        "Context fact load does not exist in this organization.",
      );
    }

    return;
  }

  if (input.entityType === "load_stop") {
    const existingLoadStop = (
      await db
        .select({ id: loadStops.id })
        .from(loadStops)
        .where(
          and(
            eq(loadStops.id, input.entityId),
            eq(loadStops.organizationId, input.organizationId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingLoadStop) {
      throw new DispatcherContextFactDomainError(
        "Context fact load stop does not exist in this organization.",
      );
    }

    return;
  }

  throw new DispatcherContextFactDomainError(
    `Unsupported context fact entity type: ${input.entityType}`,
  );
}

export async function upsertDispatcherContextFact(
  input: UpsertDispatcherContextFactInput,
  db: MutationDb = getDb(),
) {
  const sourceType = input.sourceType ?? "dispatcher_entered";
  const confidence = normalizeConfidence(input.confidence);

  assertAllowedSourceType(sourceType);
  validateDispatcherContextFactInput({
    entityType: input.entityType,
    contextKey: input.contextKey,
    contextValue: input.contextValue,
  });

  await assertContextFactEntityBelongsToOrganization(input, db);

  const existing = (
    await db
      .select()
      .from(dispatcherContextFacts)
      .where(
        and(
          eq(dispatcherContextFacts.organizationId, input.organizationId),
          eq(dispatcherContextFacts.entityType, input.entityType),
          eq(dispatcherContextFacts.entityId, input.entityId),
          eq(dispatcherContextFacts.contextKey, input.contextKey),
        ),
      )
      .limit(1)
  )[0];

  if (existing) {
    const updated = (
      await db
        .update(dispatcherContextFacts)
        .set({
          contextValue: input.contextValue,
          sourceType,
          confidence,
          sourceNote: nullableText(input.sourceNote),
          createdByUserId: input.createdByUserId ?? existing.createdByUserId,
          updatedAt: new Date(),
        })
        .where(eq(dispatcherContextFacts.id, existing.id))
        .returning()
    )[0];

    if (!updated) {
      throw new DispatcherContextFactDomainError(
        "Failed to update dispatcher context fact.",
      );
    }

    return updated;
  }

  const inserted = (
    await db
      .insert(dispatcherContextFacts)
      .values({
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        contextKey: input.contextKey,
        contextValue: input.contextValue,
        sourceType,
        confidence,
        sourceNote: nullableText(input.sourceNote),
        createdByUserId: input.createdByUserId,
      })
      .returning()
  )[0];

  if (!inserted) {
    throw new DispatcherContextFactDomainError(
      "Failed to create dispatcher context fact.",
    );
  }

  return inserted;
}
