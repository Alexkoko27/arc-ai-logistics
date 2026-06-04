import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl, hasDatabaseUrl } from "../lib/db/config";
import { seedDefaultSystemAgentsWithDb } from "../lib/db/systemAgents";
import * as schema from "../lib/db/schema";

function getDb() {
  return drizzle(neon(getDatabaseUrl("seed default agents")), { schema });
}

seedDefaultSystemAgentsWithDb({ getDb, hasDatabaseUrl })
  .then((result) => {
    console.log(`Default system agents inserted: ${result.inserted}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
