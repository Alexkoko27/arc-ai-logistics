import { getSelectedDatabaseUrlEnvName, hasDatabaseUrl } from "../db/config";

export function assertDevDispatcherDatabase(scriptName: string) {
  const selectedEnvName = getSelectedDatabaseUrlEnvName();

  if (selectedEnvName !== "DEV_DATABASE_URL") {
    throw new Error(
      `${scriptName} is dev-only. Set VERCEL_ENV=preview so it uses DEV_DATABASE_URL.`,
    );
  }

  if (!hasDatabaseUrl()) {
    throw new Error(`${scriptName} requires DEV_DATABASE_URL.`);
  }
}
