import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { loadReservations, loads, organizations } from "../lib/db/schema";
import { assertDevDispatcherDatabase } from "../lib/dispatch/devDatabaseGuard";

async function main() {
  assertDevDispatcherDatabase("verify stale active reservations");

  const db = getDb();
  const now = new Date();
  const staleActiveReservations = await db
    .select({
      reservationId: loadReservations.id,
      organizationId: loadReservations.organizationId,
      organizationSlug: organizations.slug,
      loadId: loadReservations.loadId,
      loadReference: loads.referenceNumber,
      loadStatus: loads.status,
      expiresAt: loadReservations.expiresAt,
      updatedAt: loadReservations.updatedAt,
    })
    .from(loadReservations)
    .leftJoin(organizations, eq(loadReservations.organizationId, organizations.id))
    .leftJoin(
      loads,
      and(
        eq(loadReservations.loadId, loads.id),
        eq(loadReservations.organizationId, loads.organizationId),
      ),
    )
    .where(
      and(
        eq(loadReservations.status, "active"),
        sql`${loadReservations.expiresAt} <= ${now}`,
      ),
    );

  if (staleActiveReservations.length > 0) {
    console.error("Stale active reservation verification failed:");
    console.error(JSON.stringify({ now, staleActiveReservations }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Stale active reservation verification passed:");
  console.log(JSON.stringify({ now, staleActiveReservations: 0 }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
