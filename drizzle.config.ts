import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./lib/db/config";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl("Drizzle configuration"),
  },
  strict: true,
  verbose: true,
});
