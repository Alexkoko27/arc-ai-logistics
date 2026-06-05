import { getSelectedDatabaseUrlEnvName, hasDatabaseUrl } from "../db/config";

export function assertDevDispatcherDatabaseTarget(context: string) {
  const selectedEnvName = getSelectedDatabaseUrlEnvName();

  if (selectedEnvName !== "DEV_DATABASE_URL") {
    throw new Error(
      `${context} requires DEV_DATABASE_URL. Set VERCEL_ENV=preview so dispatcher operational writes cannot target DATABASE_URL.`,
    );
  }

  if (!hasDatabaseUrl()) {
    throw new Error(`${context} requires DEV_DATABASE_URL.`);
  }
}

export function assertDevDispatcherDatabase(scriptName: string) {
  assertDevDispatcherDatabaseTarget(scriptName);
}
