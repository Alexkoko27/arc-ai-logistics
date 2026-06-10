import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { dispatcherContextFacts } from "../db/schema";
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
