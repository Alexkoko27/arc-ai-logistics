import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { seedDefaultSystemAgentsWithDb } from "../lib/db/systemAgents";
import * as schema from "../lib/db/schema";

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed default agents.");
  }

  return drizzle(neon(databaseUrl), { schema });
}

seedDefaultSystemAgentsWithDb({ getDb, hasDatabaseUrl })
  .then((result) => {
    console.log(`Default system agents inserted: ${result.inserted}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
