import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";

const migrationFile = join(
  process.cwd(),
  "drizzle",
  "0000_initial_database_design.sql",
);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const migrationSql = readFileSync(migrationFile, "utf8");
  const statements = migrationSql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) {
      await pool.query(`${statement};`);
    }
  } finally {
    await pool.end();
  }

  console.log("Database migration completed: 0000_initial_database_design.sql");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
