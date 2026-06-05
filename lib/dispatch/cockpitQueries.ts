import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import {
  drivers,
  driverVehicleAssignments,
  loadReservations,
  loadSources,
  loadStops,
  loads,
  loadSuggestions,
  locations,
  matchingRuns,
  organizations,
  vehicleLocationEvents,
  vehicles,
} from "../db/schema";
import { dispatcherMockData } from "./mockData";
import { expireDispatcherReservations } from "./reservationService";

type Db = ReturnType<typeof getDb>;
type JsonRecord = Record<string, unknown>;
type LocationRow = typeof locations.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;
type DriverRow = typeof drivers.$inferSelect;
type LoadRow = typeof loads.$inferSelect;
type LoadStopRow = typeof loadStops.$inferSelect;
type LoadReservationRow = typeof loadReservations.$inferSelect;
type LoadSuggestionRow = typeof loadSuggestions.$inferSelect;
type MatchingRunRow = typeof matchingRuns.$inferSelect;

export type DispatcherVehicleView = {
  id: string;
  unitNumber: string;
  vin: string | null;
  equipmentType: string | null;
  status: string;
  expectedAvailableAt: Date | null;
  latestLocation: LocationRow | null;
  latestLocationSeenAt: Date | null;
  assignedDriver: Pick<DriverRow, "id" | "name" | "email" | "phone"> | null;
};

export type DispatcherLoadView = {
  id: string;
  referenceNumber: string | null;
  externalId: string | null;
  status: string;
  equipmentType: string | null;
  cargoType: string | null;
  weightLbs: number | null;
  rateAmount: string | null;
  currency: string;
  distanceMiles: string | null;
  pickupStartsAt: Date | null;
  pickupEndsAt: Date | null;
  deliveryStartsAt: Date | null;
  deliveryEndsAt: Date | null;
  sourceName: string | null;
  stops: Array<LoadStopRow & { location: LocationRow | null }>;
  activeReservation: LoadReservationRow | null;
};

export type DispatcherMatchingRunView = {
  row: MatchingRunRow;
  vehiclesEvaluated: number | null;
  loadsEvaluated: number | null;
  suggestionsCreated: number | null;
};

export type DispatcherSuggestionView = {
  row: LoadSuggestionRow;
  load: LoadRow | null;
  vehicle: VehicleRow | null;
  activeReservation: LoadReservationRow | null;
  loadSnapshotSummary: string;
  vehicleSnapshotSummary: string;
  scoreBreakdownSummary: string;
};

export type DispatcherCockpitData = {
  isConfigured: boolean;
  organization:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | null;
  vehicles: DispatcherVehicleView[];
  loads: DispatcherLoadView[];
  latestMatchingRun: DispatcherMatchingRunView | null;
  suggestions: DispatcherSuggestionView[];
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberFromSnapshot(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countSnapshotItems(snapshot: unknown, key: string) {
  if (!isRecord(snapshot)) return null;
  const value = snapshot[key];
  return Array.isArray(value) ? value.length : null;
}

function getMatchingRunMetric(
  run: MatchingRunRow,
  key: "vehiclesEvaluated" | "loadsEvaluated" | "suggestionsCreated",
) {
  if (isRecord(run.metadata)) {
    const metadataValue = numberFromSnapshot(run.metadata[key]);
    if (metadataValue !== null) return metadataValue;
  }

  if (key === "vehiclesEvaluated") {
    return countSnapshotItems(run.inputSnapshot, "vehicles");
  }

  if (key === "loadsEvaluated") {
    return countSnapshotItems(run.inputSnapshot, "loads");
  }

  return null;
}

function locationSummary(location: unknown) {
  if (!isRecord(location)) return null;
  const label = typeof location.label === "string" ? location.label : null;
  const city = typeof location.city === "string" ? location.city : null;
  const state = typeof location.state === "string" ? location.state : null;
  return [label, [city, state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" - ");
}

function summarizeLoadSnapshot(snapshot: unknown) {
  if (!isRecord(snapshot)) return "Snapshot unavailable";
  const reference =
    typeof snapshot.referenceNumber === "string"
      ? snapshot.referenceNumber
      : typeof snapshot.externalId === "string"
        ? snapshot.externalId
        : "Load";
  const equipment =
    typeof snapshot.equipmentType === "string" ? snapshot.equipmentType : null;
  const stops = Array.isArray(snapshot.stops) ? snapshot.stops : [];
  const pickup = stops.find(
    (stop) => isRecord(stop) && stop.stopType === "pickup",
  );
  const dropoff = stops.find(
    (stop) => isRecord(stop) && stop.stopType === "dropoff",
  );
  const origin = isRecord(pickup) ? locationSummary(pickup.location) : null;
  const destination = isRecord(dropoff)
    ? locationSummary(dropoff.location)
    : null;

  return [reference, equipment, [origin, destination].filter(Boolean).join(" -> ")]
    .filter(Boolean)
    .join(" | ");
}

function summarizeVehicleSnapshot(snapshot: unknown) {
  if (!isRecord(snapshot)) return "Snapshot unavailable";
  const unitNumber =
    typeof snapshot.unitNumber === "string" ? snapshot.unitNumber : "Vehicle";
  const equipment =
    typeof snapshot.equipmentType === "string" ? snapshot.equipmentType : null;
  const status = typeof snapshot.status === "string" ? snapshot.status : null;
  const location = locationSummary(snapshot.currentLocation);
  return [unitNumber, equipment, status, location].filter(Boolean).join(" | ");
}

function summarizeScoreBreakdown(scoreBreakdown: unknown) {
  if (!isRecord(scoreBreakdown)) return "No score breakdown";

  return Object.entries(scoreBreakdown)
    .map(([key, value]) => {
      const score = Number(value);
      return `${key}: ${Number.isFinite(score) ? score.toFixed(1) : value}`;
    })
    .join(", ");
}

async function getDisplayOrganization(db: Db) {
  const mockOrganization = (
    await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.slug, dispatcherMockData.organizationSlug))
      .limit(1)
  )[0];

  if (mockOrganization) return mockOrganization;

  return (
    await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt))
      .limit(1)
  )[0] ?? null;
}

async function getVehicles(db: Db, organizationId: string) {
  const vehicleRows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.organizationId, organizationId))
    .orderBy(vehicles.unitNumber);

  const assignmentRows = await db
    .select({
      assignment: driverVehicleAssignments,
      driver: drivers,
    })
    .from(driverVehicleAssignments)
    .leftJoin(drivers, eq(driverVehicleAssignments.driverId, drivers.id))
    .where(
      and(
        eq(driverVehicleAssignments.organizationId, organizationId),
        eq(driverVehicleAssignments.status, "active"),
      ),
    );

  const locationEventRows = await db
    .select({
      event: vehicleLocationEvents,
      location: locations,
    })
    .from(vehicleLocationEvents)
    .leftJoin(locations, eq(vehicleLocationEvents.locationId, locations.id))
    .where(eq(vehicleLocationEvents.organizationId, organizationId))
    .orderBy(desc(vehicleLocationEvents.occurredAt));

  const assignmentByVehicle = new Map<string, DriverRow | null>();
  for (const row of assignmentRows) {
    if (!assignmentByVehicle.has(row.assignment.vehicleId)) {
      assignmentByVehicle.set(row.assignment.vehicleId, row.driver);
    }
  }

  const latestLocationByVehicle = new Map<
    string,
    { location: LocationRow | null; seenAt: Date }
  >();
  for (const row of locationEventRows) {
    if (!latestLocationByVehicle.has(row.event.vehicleId)) {
      latestLocationByVehicle.set(row.event.vehicleId, {
        location: row.location,
        seenAt: row.event.occurredAt,
      });
    }
  }

  return vehicleRows.map((vehicle): DispatcherVehicleView => {
    const latestLocation = latestLocationByVehicle.get(vehicle.id);
    const driver = assignmentByVehicle.get(vehicle.id) ?? null;

    return {
      id: vehicle.id,
      unitNumber: vehicle.unitNumber,
      vin: vehicle.vin,
      equipmentType: vehicle.equipmentType,
      status: vehicle.status,
      expectedAvailableAt: vehicle.expectedAvailableAt,
      latestLocation: latestLocation?.location ?? null,
      latestLocationSeenAt: latestLocation?.seenAt ?? null,
      assignedDriver: driver
        ? {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone,
          }
        : null,
    };
  });
}

async function getLoads(db: Db, organizationId: string) {
  const loadRows = await db
    .select({
      load: loads,
      source: loadSources,
    })
    .from(loads)
    .leftJoin(loadSources, eq(loads.loadSourceId, loadSources.id))
    .where(eq(loads.organizationId, organizationId))
    .orderBy(desc(loads.createdAt));

  const stopRows = await db
    .select({
      stop: loadStops,
      location: locations,
    })
    .from(loadStops)
    .leftJoin(locations, eq(loadStops.locationId, locations.id))
    .where(eq(loadStops.organizationId, organizationId));

  const reservationRows = await db
    .select()
    .from(loadReservations)
    .where(
      and(
        eq(loadReservations.organizationId, organizationId),
        eq(loadReservations.status, "active"),
        sql`${loadReservations.expiresAt} > now()`,
      ),
    );

  const stopsByLoad = new Map<
    string,
    Array<LoadStopRow & { location: LocationRow | null }>
  >();
  for (const row of stopRows) {
    const existing = stopsByLoad.get(row.stop.loadId) ?? [];
    existing.push({ ...row.stop, location: row.location });
    stopsByLoad.set(row.stop.loadId, existing);
  }

  const activeReservationByLoad = new Map<string, LoadReservationRow>();
  for (const reservation of reservationRows) {
    activeReservationByLoad.set(reservation.loadId, reservation);
  }

  return loadRows.map(({ load, source }): DispatcherLoadView => ({
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
    pickupStartsAt: load.pickupStartsAt,
    pickupEndsAt: load.pickupEndsAt,
    deliveryStartsAt: load.deliveryStartsAt,
    deliveryEndsAt: load.deliveryEndsAt,
    sourceName: source?.name ?? null,
    stops: (stopsByLoad.get(load.id) ?? []).sort(
      (a, b) => a.sequence - b.sequence,
    ),
    activeReservation: activeReservationByLoad.get(load.id) ?? null,
  }));
}

async function getLatestMatchingRun(db: Db, organizationId: string) {
  const latestRun = (
    await db
      .select()
      .from(matchingRuns)
      .where(eq(matchingRuns.organizationId, organizationId))
      .orderBy(desc(matchingRuns.createdAt))
      .limit(1)
  )[0];

  if (!latestRun) return null;

  return {
    row: latestRun,
    vehiclesEvaluated: getMatchingRunMetric(latestRun, "vehiclesEvaluated"),
    loadsEvaluated: getMatchingRunMetric(latestRun, "loadsEvaluated"),
    suggestionsCreated: getMatchingRunMetric(latestRun, "suggestionsCreated"),
  };
}

async function getSuggestions(
  db: Db,
  organizationId: string,
  matchingRunId: string,
) {
  const suggestionRows = await db
    .select({
      suggestion: loadSuggestions,
      load: loads,
      vehicle: vehicles,
    })
    .from(loadSuggestions)
    .leftJoin(loads, eq(loadSuggestions.loadId, loads.id))
    .leftJoin(vehicles, eq(loadSuggestions.vehicleId, vehicles.id))
    .where(
      and(
        eq(loadSuggestions.organizationId, organizationId),
        eq(loadSuggestions.matchingRunId, matchingRunId),
      ),
    )
    .orderBy(loadSuggestions.rank);

  const activeReservations = await db
    .select()
    .from(loadReservations)
    .where(
      and(
        eq(loadReservations.organizationId, organizationId),
        eq(loadReservations.status, "active"),
        sql`${loadReservations.expiresAt} > now()`,
      ),
    );

  const activeReservationByLoad = new Map<string, LoadReservationRow>();
  for (const reservation of activeReservations) {
    activeReservationByLoad.set(reservation.loadId, reservation);
  }

  return suggestionRows.map(({ suggestion, load, vehicle }) => ({
    row: suggestion,
    load,
    vehicle,
    activeReservation: activeReservationByLoad.get(suggestion.loadId) ?? null,
    loadSnapshotSummary: summarizeLoadSnapshot(suggestion.loadSnapshot),
    vehicleSnapshotSummary: summarizeVehicleSnapshot(suggestion.vehicleSnapshot),
    scoreBreakdownSummary: summarizeScoreBreakdown(suggestion.scoreBreakdown),
  }));
}

export async function getDispatcherCockpitData(): Promise<DispatcherCockpitData> {
  if (!hasDatabaseUrl()) {
    return {
      isConfigured: false,
      organization: null,
      vehicles: [],
      loads: [],
      latestMatchingRun: null,
      suggestions: [],
    };
  }

  const db = getDb();
  const organization = await getDisplayOrganization(db);

  if (!organization) {
    return {
      isConfigured: true,
      organization: null,
      vehicles: [],
      loads: [],
      latestMatchingRun: null,
      suggestions: [],
    };
  }

  await expireDispatcherReservations({ db, organizationId: organization.id });

  const [vehicleViews, loadViews, latestMatchingRun] = await Promise.all([
    getVehicles(db, organization.id),
    getLoads(db, organization.id),
    getLatestMatchingRun(db, organization.id),
  ]);

  const suggestions = latestMatchingRun
    ? await getSuggestions(db, organization.id, latestMatchingRun.row.id)
    : [];

  return {
    isConfigured: true,
    organization,
    vehicles: vehicleViews,
    loads: loadViews,
    latestMatchingRun,
    suggestions,
  };
}
