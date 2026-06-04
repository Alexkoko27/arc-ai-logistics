import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  loadSuggestions,
  loadStops,
  loads,
  locations,
  matchingRuns,
  vehicleLocationEvents,
  vehicles,
} from "../db/schema";

const modelProvider = "arc-deterministic";
const modelName = "stage-1b-mock-matcher";
const modelVersion = "2026-06-04";

type Db = ReturnType<typeof getDb>;
type VehicleRow = typeof vehicles.$inferSelect;
type LoadRow = typeof loads.$inferSelect;
type LocationRow = typeof locations.$inferSelect;
type LoadStopRow = typeof loadStops.$inferSelect;

type LoadWithStops = LoadRow & {
  stops: Array<LoadStopRow & { location: LocationRow | null }>;
};

type VehicleContext = VehicleRow & {
  currentLocation: LocationRow | null;
};

type ScoreBreakdown = {
  availability: number;
  pickupProximity: number;
  revenue: number;
  estimatedProfit: number;
  timingCompatibility: number;
  riskSimplicity: number;
};

export type MatchingSuggestionResult = {
  suggestionId: string;
  vehicleId: string;
  loadId: string;
  rank: number;
  scoreTotal: number;
  estimatedDeadheadMiles: number;
  estimatedProfit: number;
  explanation: string;
};

export type MatchingRunResult = {
  matchingRunId: string;
  organizationId: string;
  vehiclesEvaluated: number;
  loadsEvaluated: number;
  suggestionsCreated: number;
  suggestions: MatchingSuggestionResult[];
};

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function metadataNumber(
  metadata: unknown,
  key: string,
  fallback: number,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }

  return toNumber((metadata as Record<string, unknown>)[key], fallback);
}

function hoursUntil(date: Date | null) {
  if (!date) return 999;
  return (date.getTime() - Date.now()) / (60 * 60 * 1000);
}

function milesBetween(a: LocationRow | null, b: LocationRow | null) {
  if (!a || !b) return 999;

  const lat1 = toNumber(a.latitude);
  const lon1 = toNumber(a.longitude);
  const lat2 = toNumber(b.latitude);
  const lon2 = toNumber(b.longitude);
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;

  const radiusMiles = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;

  return radiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function pickupStop(load: LoadWithStops) {
  return load.stops
    .filter((stop) => stop.stopType === "pickup")
    .sort((a, b) => a.sequence - b.sequence)[0];
}

function scoreVehicleLoad(vehicle: VehicleContext, load: LoadWithStops) {
  if (!vehicle.equipmentType || !load.equipmentType) return null;
  if (vehicle.equipmentType !== load.equipmentType) return null;

  const pickup = pickupStop(load);
  if (!pickup?.location) return null;

  const availableAt =
    vehicle.status === "available_soon" ? vehicle.expectedAvailableAt : null;
  const pickupStartsAt = load.pickupStartsAt ?? pickup.appointmentStartsAt;
  const pickupWindowHours = hoursUntil(pickupStartsAt);
  const availableWindowHours = hoursUntil(availableAt);

  if (vehicle.status === "available_soon" && availableWindowHours > pickupWindowHours) {
    return null;
  }

  const deadheadMiles = milesBetween(vehicle.currentLocation, pickup.location);
  const rateAmount = toNumber(load.rateAmount);
  const distanceMiles = toNumber(load.distanceMiles);
  const costPerMile = metadataNumber(vehicle.metadata, "costPerMile", 1.85);
  const estimatedProfit = rateAmount - (distanceMiles + deadheadMiles) * costPerMile;
  const ratePerMile = distanceMiles > 0 ? rateAmount / distanceMiles : 0;

  const breakdown: ScoreBreakdown = {
    availability: vehicle.status === "available" ? 30 : 24,
    pickupProximity: Math.max(0, 25 - deadheadMiles / 12),
    revenue: Math.min(18, ratePerMile * 2.5),
    estimatedProfit: Math.max(0, Math.min(17, estimatedProfit / 150)),
    timingCompatibility: pickupWindowHours >= 4 ? 8 : 4,
    riskSimplicity: 7,
  };

  const scoreTotal = Object.values(breakdown).reduce(
    (sum, value) => sum + value,
    0,
  );

  if (scoreTotal < 35 || estimatedProfit <= 0) return null;

  return {
    scoreTotal,
    scoreBreakdown: breakdown,
    estimatedDeadheadMiles: deadheadMiles,
    estimatedProfit,
    explanation: [
      `${vehicle.unitNumber} matches ${load.referenceNumber ?? load.externalId}.`,
      `Equipment is ${vehicle.equipmentType}.`,
      `Estimated deadhead is ${deadheadMiles.toFixed(1)} miles.`,
      `Estimated profit is $${estimatedProfit.toFixed(2)}.`,
    ].join(" "),
  };
}

function snapshotVehicle(vehicle: VehicleContext) {
  return {
    id: vehicle.id,
    unitNumber: vehicle.unitNumber,
    equipmentType: vehicle.equipmentType,
    status: vehicle.status,
    expectedAvailableAt: vehicle.expectedAvailableAt?.toISOString() ?? null,
    currentLocation: vehicle.currentLocation
      ? {
          id: vehicle.currentLocation.id,
          label: vehicle.currentLocation.label,
          city: vehicle.currentLocation.city,
          state: vehicle.currentLocation.state,
          latitude: vehicle.currentLocation.latitude,
          longitude: vehicle.currentLocation.longitude,
        }
      : null,
    metadata: vehicle.metadata,
  };
}

function snapshotLoad(load: LoadWithStops) {
  return {
    id: load.id,
    referenceNumber: load.referenceNumber,
    externalId: load.externalId,
    status: load.status,
    equipmentType: load.equipmentType,
    cargoType: load.cargoType,
    weightLbs: load.weightLbs,
    rateAmount: load.rateAmount,
    currency: load.currency,
    distanceMiles: load.distanceMiles,
    pickupStartsAt: load.pickupStartsAt?.toISOString() ?? null,
    pickupEndsAt: load.pickupEndsAt?.toISOString() ?? null,
    deliveryStartsAt: load.deliveryStartsAt?.toISOString() ?? null,
    deliveryEndsAt: load.deliveryEndsAt?.toISOString() ?? null,
    stops: load.stops.map((stop) => ({
      id: stop.id,
      stopType: stop.stopType,
      sequence: stop.sequence,
      appointmentStartsAt: stop.appointmentStartsAt?.toISOString() ?? null,
      appointmentEndsAt: stop.appointmentEndsAt?.toISOString() ?? null,
      location: stop.location
        ? {
            id: stop.location.id,
            label: stop.location.label,
            city: stop.location.city,
            state: stop.location.state,
            latitude: stop.location.latitude,
            longitude: stop.location.longitude,
          }
        : null,
    })),
  };
}

async function loadVehicleContexts(db: Db, organizationId: string) {
  const vehicleRows = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.organizationId, organizationId),
        inArray(vehicles.status, ["available", "available_soon"]),
      ),
    );

  const eventRows = await db
    .select({
      event: vehicleLocationEvents,
      location: locations,
    })
    .from(vehicleLocationEvents)
    .leftJoin(locations, eq(vehicleLocationEvents.locationId, locations.id))
    .where(eq(vehicleLocationEvents.organizationId, organizationId))
    .orderBy(desc(vehicleLocationEvents.occurredAt));

  const latestLocationByVehicle = new Map<string, LocationRow | null>();
  for (const row of eventRows) {
    if (!latestLocationByVehicle.has(row.event.vehicleId)) {
      latestLocationByVehicle.set(row.event.vehicleId, row.location);
    }
  }

  return vehicleRows.map((vehicle) => ({
    ...vehicle,
    currentLocation: latestLocationByVehicle.get(vehicle.id) ?? null,
  }));
}

async function loadAvailableLoads(db: Db, organizationId: string) {
  const loadRows = await db
    .select()
    .from(loads)
    .where(
      and(eq(loads.organizationId, organizationId), eq(loads.status, "available")),
    );

  const stopRows = await db
    .select({
      stop: loadStops,
      location: locations,
    })
    .from(loadStops)
    .leftJoin(locations, eq(loadStops.locationId, locations.id))
    .where(eq(loadStops.organizationId, organizationId));

  const stopsByLoad = new Map<
    string,
    Array<LoadStopRow & { location: LocationRow | null }>
  >();
  for (const row of stopRows) {
    const existing = stopsByLoad.get(row.stop.loadId) ?? [];
    existing.push({ ...row.stop, location: row.location });
    stopsByLoad.set(row.stop.loadId, existing);
  }

  return loadRows.map((load) => ({
    ...load,
    stops: (stopsByLoad.get(load.id) ?? []).sort(
      (a, b) => a.sequence - b.sequence,
    ),
  }));
}

export async function runMatchingEngine({
  organizationId,
  requestedByUserId,
  db = getDb(),
}: {
  organizationId: string;
  requestedByUserId?: string;
  db?: Db;
}): Promise<MatchingRunResult> {
  const vehicleContexts = await loadVehicleContexts(db, organizationId);
  const availableLoads = await loadAvailableLoads(db, organizationId);

  const inputSnapshot = {
    organizationId,
    generatedAt: new Date().toISOString(),
    vehicleStatuses: ["available", "available_soon"],
    loadStatuses: ["available"],
    vehicles: vehicleContexts.map(snapshotVehicle),
    loads: availableLoads.map(snapshotLoad),
  };

  const matchingRun = (
    await db
      .insert(matchingRuns)
      .values({
        organizationId,
        requestedByUserId: requestedByUserId ?? null,
        status: "running",
        inputSnapshot,
        modelProvider,
        modelName,
        modelVersion,
        explanation:
          "Stage 1B deterministic mock matching run. No external AI API was used.",
        metadata: { stage: "1B" },
      })
      .returning()
  )[0];

  if (!matchingRun) throw new Error("Failed to create matching run.");

  const suggestionsToInsert = vehicleContexts.flatMap((vehicle) => {
    return availableLoads
      .map((load) => {
        const score = scoreVehicleLoad(vehicle, load);
        return score ? { vehicle, load, score } : null;
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((a, b) => b.score.scoreTotal - a.score.scoreTotal)
      .slice(0, 3)
      .map((candidate, index) => ({
        organizationId,
        matchingRunId: matchingRun.id,
        loadId: candidate.load.id,
        vehicleId: candidate.vehicle.id,
        status: "suggested",
        rank: index + 1,
        scoreTotal: candidate.score.scoreTotal.toFixed(4),
        scoreBreakdown: candidate.score.scoreBreakdown,
        estimatedDeadheadMiles:
          candidate.score.estimatedDeadheadMiles.toFixed(2),
        estimatedProfit: candidate.score.estimatedProfit.toFixed(2),
        explanation: candidate.score.explanation,
        loadSnapshot: snapshotLoad(candidate.load),
        vehicleSnapshot: snapshotVehicle(candidate.vehicle),
        modelProvider,
        modelName,
        modelVersion,
        outcome: "generated",
        metadata: { stage: "1B" },
      }));
  });

  const insertedSuggestions =
    suggestionsToInsert.length > 0
      ? await db.insert(loadSuggestions).values(suggestionsToInsert).returning()
      : [];

  await db
    .update(matchingRuns)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        stage: "1B",
        vehiclesEvaluated: vehicleContexts.length,
        loadsEvaluated: availableLoads.length,
        suggestionsCreated: insertedSuggestions.length,
      },
    })
    .where(eq(matchingRuns.id, matchingRun.id));

  return {
    matchingRunId: matchingRun.id,
    organizationId,
    vehiclesEvaluated: vehicleContexts.length,
    loadsEvaluated: availableLoads.length,
    suggestionsCreated: insertedSuggestions.length,
    suggestions: insertedSuggestions.map((suggestion) => ({
      suggestionId: suggestion.id,
      vehicleId: suggestion.vehicleId,
      loadId: suggestion.loadId,
      rank: suggestion.rank ?? 0,
      scoreTotal: toNumber(suggestion.scoreTotal),
      estimatedDeadheadMiles: toNumber(suggestion.estimatedDeadheadMiles),
      estimatedProfit: toNumber(suggestion.estimatedProfit),
      explanation: suggestion.explanation ?? "",
    })),
  };
}

export const matchingEngineMetadata = {
  modelProvider,
  modelName,
  modelVersion,
};
