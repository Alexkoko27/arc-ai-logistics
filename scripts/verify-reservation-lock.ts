import { and, eq } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { loadReservations, loads, organizations } from "../lib/db/schema";
import { assertDevDispatcherDatabase } from "../lib/dispatch/devDatabaseGuard";
import { dispatcherMockData, seedDispatcherMockData } from "../lib/dispatch/mockData";
import { runMatchingEngine } from "../lib/dispatch/matchingEngine";
import {
  ActiveLoadReservationConflictError,
  releaseLoadReservation,
  reserveLoad,
} from "../lib/dispatch/reservationService";

async function main() {
  assertDevDispatcherDatabase("verify reservation lock");

  await seedDispatcherMockData();

  const db = getDb();
  const organization = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, dispatcherMockData.organizationSlug))
      .limit(1)
  )[0];

  if (!organization) {
    throw new Error("Mock dispatcher organization was not found.");
  }

  const mockLoads = await db
    .select()
    .from(loads)
    .where(
      and(
        eq(loads.organizationId, organization.id),
        eq(loads.sourceId, dispatcherMockData.mockSourceId),
      ),
    );

  let cleanedPreviousActiveReservations = 0;
  for (const mockLoad of mockLoads) {
    const activeReservations = await db
      .select()
      .from(loadReservations)
      .where(
        and(
          eq(loadReservations.loadId, mockLoad.id),
          eq(loadReservations.status, "active"),
        ),
      );

    for (const activeReservation of activeReservations) {
      await releaseLoadReservation({
        db,
        organizationId: organization.id,
        reservationId: activeReservation.id,
        releaseReason: "released",
      });
      cleanedPreviousActiveReservations += 1;
    }

    await db
      .update(loads)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(loads.id, mockLoad.id));
  }

  const matchingResult = await runMatchingEngine({
    db,
    organizationId: organization.id,
  });
  const suggestion = matchingResult.suggestions[0];

  if (!suggestion) {
    throw new Error("No matching suggestion was generated for verification.");
  }

  const firstReservation = await reserveLoad({
    db,
    organizationId: organization.id,
    loadId: suggestion.loadId,
    vehicleId: suggestion.vehicleId,
    loadSuggestionId: suggestion.suggestionId,
  });

  let duplicateBlocked = false;
  try {
    await reserveLoad({
      db,
      organizationId: organization.id,
      loadId: suggestion.loadId,
      vehicleId: suggestion.vehicleId,
    });
  } catch (error) {
    if (!(error instanceof ActiveLoadReservationConflictError)) {
      throw error;
    }

    duplicateBlocked = true;
  }

  if (!duplicateBlocked) {
    throw new Error("Expected duplicate active reservation to be blocked.");
  }

  await releaseLoadReservation({
    db,
    organizationId: organization.id,
    reservationId: firstReservation.id,
    releaseReason: "released",
  });

  const secondReservation = await reserveLoad({
    db,
    organizationId: organization.id,
    loadId: suggestion.loadId,
    vehicleId: suggestion.vehicleId,
    loadSuggestionId: suggestion.suggestionId,
  });

  await releaseLoadReservation({
    db,
    organizationId: organization.id,
    reservationId: secondReservation.id,
    releaseReason: "released",
  });

  console.log("Reservation lock verification passed:");
  console.log(
    JSON.stringify(
      {
        cleanedPreviousActiveReservations,
        matchingRunId: matchingResult.matchingRunId,
        loadId: suggestion.loadId,
        firstReservationId: firstReservation.id,
        duplicateBlockedAsExpected: duplicateBlocked,
        secondReservationId: secondReservation.id,
        finalReservationReleased: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
