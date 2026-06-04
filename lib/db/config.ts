const previewEnvironment = "preview";

export function getSelectedDatabaseUrlEnvName() {
  return process.env.VERCEL_ENV === previewEnvironment
    ? "DEV_DATABASE_URL"
    : "DATABASE_URL";
}

export function hasDatabaseUrl() {
  return Boolean(process.env[getSelectedDatabaseUrlEnvName()]);
}

export function getDatabaseUrl(context = "database access") {
  const envName = getSelectedDatabaseUrlEnvName();
  const databaseUrl = process.env[envName];

  if (!databaseUrl) {
    throw new Error(`${envName} is required for ${context}.`);
  }

  return databaseUrl;
}
