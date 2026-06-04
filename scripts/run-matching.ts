import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { organizations } from "../lib/db/schema";
import { assertDevDispatcherDatabase } from "../lib/dispatch/devDatabaseGuard";
import { dispatcherMockData, seedDispatcherMockData } from "../lib/dispatch/mockData";
import { runMatchingEngine } from "../lib/dispatch/matchingEngine";

async function main() {
  assertDevDispatcherDatabase("run dispatcher matching");

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

  const result = await runMatchingEngine({
    db,
    organizationId: organization.id,
  });

  console.log("Dispatcher matching run completed:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
