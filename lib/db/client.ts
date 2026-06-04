import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl, hasDatabaseUrl } from "./config";
import * as schema from "./schema";

export { hasDatabaseUrl };

export function getDb() {
  return drizzle(neon(getDatabaseUrl()), { schema });
}
