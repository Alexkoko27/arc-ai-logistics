import { count, isNull } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "./client";
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
    slug: "risk-agent",
    name: "Risk Agent",
    category: "system",
    description: "Weather, historical lane, appointment, and aggregate risk.",
    defaultPriceUsdc: "0.001",
  },
  {
    slug: "economics-agent",
    name: "Economics Agent",
    category: "system",
    description: "Revenue, cost, margin, RPM, and true net profit analysis.",
    defaultPriceUsdc: "0.0015",
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
    throw new Error("DATABASE_URL is required to seed default agents.");
  }

  const db = getDatabase();
  const [agentCount] = await db.select({ value: count() }).from(agents);

  if ((agentCount?.value ?? 0) > 0) return { inserted: 0 };

  await db.insert(agents).values(
    defaultSystemAgents.map((agent) => ({
      ...agent,
      ownerUserId: null,
      isActive: true,
    })),
  );

  return { inserted: defaultSystemAgents.length };
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
