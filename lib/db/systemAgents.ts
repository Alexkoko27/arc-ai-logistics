import { eq, isNull } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "./client";
import { getSelectedDatabaseUrlEnvName } from "./config";
import { agents } from "./schema";

export const defaultSystemAgents = [
  {
    slug: "gps-agent",
    name: "GPS Agent",
    category: "system",
    description: "Fleet location and availability context.",
    defaultPriceUsdc: "0.001",
  },
  {
    slug: "route-agent",
    name: "Route Agent",
    category: "system",
    description: "Deadhead, loaded miles, ETA, and route source context.",
    defaultPriceUsdc: "0.0015",
  },
  {
    slug: "economics-agent",
    name: "Economics Agent",
    category: "system",
    description: "Revenue, cost, margin, RPM, and true net profit analysis.",
    defaultPriceUsdc: "0.0015",
  },
  {
    slug: "risk-agent",
    name: "Risk Agent",
    category: "system",
    description: "Historical lane, appointment, and aggregate risk synthesis.",
    defaultPriceUsdc: "0.0005",
  },
  {
    slug: "weather-agent",
    name: "Weather Agent",
    category: "system",
    description: "OpenWeather and fallback weather risk evaluation.",
    defaultPriceUsdc: "0.0005",
  },
] as const;

export type DefaultSystemAgentSlug = (typeof defaultSystemAgents)[number]["slug"];

export async function seedDefaultSystemAgents() {
  return seedDefaultSystemAgentsWithDb({ getDb, hasDatabaseUrl });
}

export async function seedDefaultSystemAgentsWithDb({
  getDb: getDatabase,
  hasDatabaseUrl: hasUrl,
}: {
  getDb: typeof getDb;
  hasDatabaseUrl: typeof hasDatabaseUrl;
}) {
  if (!hasUrl()) {
    throw new Error(
      `${getSelectedDatabaseUrlEnvName()} is required to seed default agents.`,
    );
  }

  const db = getDatabase();
  const existingAgents = await db.select({ slug: agents.slug }).from(agents);
  const existingSlugs = new Set(existingAgents.map((agent) => agent.slug));
  const missingAgents = defaultSystemAgents.filter(
    (agent) => !existingSlugs.has(agent.slug),
  );
  let inserted = 0;

  if (missingAgents.length > 0) {
    await db.insert(agents).values(
      missingAgents.map((agent) => ({
        ...agent,
        ownerUserId: null,
        isActive: true,
      })),
    );
    inserted = missingAgents.length;
  }

  for (const agent of defaultSystemAgents) {
    if (!existingSlugs.has(agent.slug)) continue;

    await db
      .update(agents)
      .set({
        name: agent.name,
        category: agent.category,
        description: agent.description,
        defaultPriceUsdc: agent.defaultPriceUsdc,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(agents.slug, agent.slug));
  }

  return { inserted };
}

export async function getDefaultSystemAgentMap() {
  const db = getDb();
  await seedDefaultSystemAgents();

  const rows = await db
    .select()
    .from(agents)
    .where(isNull(agents.ownerUserId));

  return new Map(rows.map((agent) => [agent.slug, agent]));
}
