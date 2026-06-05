import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { getDatabaseUrl } from "../lib/db/config";
import { assertDevDispatcherDatabase } from "../lib/dispatch/devDatabaseGuard";

const migrationsDir = join(process.cwd(), "drizzle");

function checksum(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function migrationStatements(migrationSql: string) {
  return migrationSql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  assertDevDispatcherDatabase("database migrations");

  const databaseUrl = getDatabaseUrl("database migrations");
  const pool = new Pool({ connectionString: databaseUrl });
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const appliedResult = await pool.query<{
      filename: string;
      checksum: string;
    }>("SELECT filename, checksum FROM schema_migrations");
    const appliedMigrations = new Map(
      appliedResult.rows.map((row) => [row.filename, row.checksum]),
    );

    for (const file of migrationFiles) {
      const migrationSql = readFileSync(join(migrationsDir, file), "utf8");
      const migrationChecksum = checksum(migrationSql);
      const appliedChecksum = appliedMigrations.get(file);

      if (appliedChecksum) {
        if (appliedChecksum !== migrationChecksum) {
          throw new Error(
            `Migration checksum mismatch for ${file}. The file changed after it was applied.`,
          );
        }

        console.log(`Database migration skipped: ${file}`);
        continue;
      }

      try {
        await pool.query("BEGIN");

        for (const statement of migrationStatements(migrationSql)) {
          await pool.query(`${statement};`);
        }

        await pool.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [file, migrationChecksum],
        );
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw new Error(`Database migration failed: ${file}`, {
          cause: error,
        });
      }

      console.log(`Database migration completed: ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
