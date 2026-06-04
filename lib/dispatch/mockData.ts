import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  counterparties,
  drivers,
  driverVehicleAssignments,
  loadSources,
  loadStops,
  loads,
  locations,
  organizationMembers,
  organizations,
  users,
  vehicleLocationEvents,
  vehicles,
} from "../db/schema";

const mockSourceId = "stage-1b-mock";
const organizationSlug = "arc-demo-dispatcher";

const locationSeeds = [
  {
    key: "chicago-il",
    label: "Chicago Yard",
    city: "Chicago",
    state: "IL",
    latitude: "41.8781000",
    longitude: "-87.6298000",
    timezone: "America/Chicago",
  },
  {
    key: "indianapolis-in",
    label: "Indianapolis Crossdock",
    city: "Indianapolis",
    state: "IN",
    latitude: "39.7684000",
    longitude: "-86.1581000",
    timezone: "America/Indiana/Indianapolis",
  },
  {
    key: "columbus-oh",
    label: "Columbus DC",
    city: "Columbus",
    state: "OH",
    latitude: "39.9612000",
    longitude: "-82.9988000",
    timezone: "America/New_York",
  },
  {
    key: "detroit-mi",
    label: "Detroit Plant",
    city: "Detroit",
    state: "MI",
    latitude: "42.3314000",
    longitude: "-83.0458000",
    timezone: "America/Detroit",
  },
  {
    key: "nashville-tn",
    label: "Nashville DC",
    city: "Nashville",
    state: "TN",
    latitude: "36.1627000",
    longitude: "-86.7816000",
    timezone: "America/Chicago",
  },
  {
    key: "atlanta-ga",
    label: "Atlanta Fulfillment",
    city: "Atlanta",
    state: "GA",
    latitude: "33.7490000",
    longitude: "-84.3880000",
    timezone: "America/New_York",
  },
  {
    key: "louisville-ky",
    label: "Louisville Terminal",
    city: "Louisville",
    state: "KY",
    latitude: "38.2527000",
    longitude: "-85.7585000",
    timezone: "America/Kentucky/Louisville",
  },
  {
    key: "st-louis-mo",
    label: "St. Louis Warehouse",
    city: "St. Louis",
    state: "MO",
    latitude: "38.6270000",
    longitude: "-90.1994000",
    timezone: "America/Chicago",
  },
  {
    key: "memphis-tn",
    label: "Memphis Rail Ramp",
    city: "Memphis",
    state: "TN",
    latitude: "35.1495000",
    longitude: "-90.0490000",
    timezone: "America/Chicago",
  },
] as const;

const vehicleSeeds = [
  {
    unitNumber: "ARC-101",
    equipmentType: "dry_van",
    status: "available",
    locationKey: "chicago-il",
    costPerMile: 1.72,
  },
  {
    unitNumber: "ARC-102",
    equipmentType: "reefer",
    status: "available_soon",
    locationKey: "indianapolis-in",
    costPerMile: 1.96,
  },
  {
    unitNumber: "ARC-103",
    equipmentType: "dry_van",
    status: "busy",
    locationKey: "nashville-tn",
    costPerMile: 1.68,
  },
  {
    unitNumber: "ARC-104",
    equipmentType: "flatbed",
    status: "maintenance",
    locationKey: "st-louis-mo",
    costPerMile: 2.1,
  },
] as const;

const driverSeeds = [
  { name: "Maya Johnson", email: "maya.johnson@arc-demo.local" },
  { name: "Owen Ramirez", email: "owen.ramirez@arc-demo.local" },
  { name: "Priya Shah", email: "priya.shah@arc-demo.local" },
  { name: "Caleb Brooks", email: "caleb.brooks@arc-demo.local" },
] as const;

const counterpartySeeds = [
  {
    externalId: "mock-broker-northstar",
    name: "Northstar Freight Brokerage",
    contactName: "Lena Moore",
  },
  {
    externalId: "mock-shipper-midwest",
    name: "Midwest Retail Supply",
    contactName: "Evan Clarke",
  },
] as const;

const loadSeeds = [
  {
    externalId: "MOCK-LOAD-1001",
    referenceNumber: "ARCM-1001",
    equipmentType: "dry_van",
    cargoType: "Retail pallets",
    weightLbs: 32000,
    rateAmount: "2450.00",
    distanceMiles: "360.00",
    pickupLocationKey: "chicago-il",
    deliveryLocationKey: "columbus-oh",
    pickupOffsetHours: 8,
    deliveryOffsetHours: 24,
    counterpartyExternalId: "mock-broker-northstar",
  },
  {
    externalId: "MOCK-LOAD-1002",
    referenceNumber: "ARCM-1002",
    equipmentType: "reefer",
    cargoType: "Frozen food",
    weightLbs: 28000,
    rateAmount: "3100.00",
    distanceMiles: "430.00",
    pickupLocationKey: "indianapolis-in",
    deliveryLocationKey: "atlanta-ga",
    pickupOffsetHours: 10,
    deliveryOffsetHours: 34,
    counterpartyExternalId: "mock-shipper-midwest",
  },
  {
    externalId: "MOCK-LOAD-1003",
    referenceNumber: "ARCM-1003",
    equipmentType: "dry_van",
    cargoType: "Auto parts",
    weightLbs: 21000,
    rateAmount: "1800.00",
    distanceMiles: "275.00",
    pickupLocationKey: "detroit-mi",
    deliveryLocationKey: "louisville-ky",
    pickupOffsetHours: 6,
    deliveryOffsetHours: 20,
    counterpartyExternalId: "mock-broker-northstar",
  },
  {
    externalId: "MOCK-LOAD-1004",
    referenceNumber: "ARCM-1004",
    equipmentType: "dry_van",
    cargoType: "Consumer goods",
    weightLbs: 36000,
    rateAmount: "2650.00",
    distanceMiles: "410.00",
    pickupLocationKey: "st-louis-mo",
    deliveryLocationKey: "memphis-tn",
    pickupOffsetHours: 18,
    deliveryOffsetHours: 42,
    counterpartyExternalId: "mock-shipper-midwest",
  },
] as const;

type Db = ReturnType<typeof getDb>;

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function firstOrInsert<T>(
  selectRow: () => Promise<T[]>,
  insertRow: () => Promise<T[]>,
) {
  const existing = await selectRow();
  if (existing[0]) return existing[0];
  const inserted = await insertRow();
  if (!inserted[0]) throw new Error("Expected inserted mock row.");
  return inserted[0];
}

export async function seedDispatcherMockData(db: Db = getDb()) {
  const organization = await firstOrInsert(
    () =>
      db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, organizationSlug))
        .limit(1),
    () =>
      db
        .insert(organizations)
        .values({
          name: "Arc Demo Dispatch",
          slug: organizationSlug,
          status: "active",
          metadata: { seededBy: mockSourceId },
        })
        .returning(),
  );

  const dispatcher = await firstOrInsert(
    () =>
      db
        .select()
        .from(users)
        .where(eq(users.email, "dispatcher@arc-demo.local"))
        .limit(1),
    () =>
      db
        .insert(users)
        .values({
          email: "dispatcher@arc-demo.local",
          name: "Demo Dispatcher",
          status: "active",
          metadata: { seededBy: mockSourceId },
        })
        .returning(),
  );

  await db
    .insert(organizationMembers)
    .values({
      organizationId: organization.id,
      userId: dispatcher.id,
      role: "dispatcher",
      status: "active",
    })
    .onConflictDoUpdate({
      target: [
        organizationMembers.organizationId,
        organizationMembers.userId,
      ],
      set: { role: "dispatcher", status: "active", updatedAt: new Date() },
    });

  const locationByKey = new Map<string, typeof locations.$inferSelect>();
  for (const seed of locationSeeds) {
    const location = await firstOrInsert(
      () =>
        db
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.organizationId, organization.id),
              eq(locations.label, seed.label),
            ),
          )
          .limit(1),
      () =>
        db
          .insert(locations)
          .values({
            organizationId: organization.id,
            label: seed.label,
            city: seed.city,
            state: seed.state,
            country: "US",
            latitude: seed.latitude,
            longitude: seed.longitude,
            timezone: seed.timezone,
            rawPayload: { seedKey: seed.key },
            payloadHash: `${mockSourceId}:${seed.key}`,
          })
          .returning(),
    );
    locationByKey.set(seed.key, location);
  }

  const source = await firstOrInsert(
    () =>
      db
        .select()
        .from(loadSources)
        .where(
          and(
            eq(loadSources.organizationId, organization.id),
            eq(loadSources.name, "Mock Load Board"),
          ),
        )
        .limit(1),
    () =>
      db
        .insert(loadSources)
        .values({
          organizationId: organization.id,
          name: "Mock Load Board",
          sourceType: "mock",
          status: "active",
          metadata: { seededBy: mockSourceId },
        })
        .returning(),
  );

  const counterpartyByExternalId = new Map<
    string,
    typeof counterparties.$inferSelect
  >();
  for (const seed of counterpartySeeds) {
    const counterparty = await firstOrInsert(
      () =>
        db
          .select()
          .from(counterparties)
          .where(
            and(
              eq(counterparties.organizationId, organization.id),
              eq(counterparties.sourceId, mockSourceId),
              eq(counterparties.externalId, seed.externalId),
            ),
          )
          .limit(1),
      () =>
        db
          .insert(counterparties)
          .values({
            organizationId: organization.id,
            name: seed.name,
            counterpartyType: "broker",
            contactName: seed.contactName,
            sourceId: mockSourceId,
            externalId: seed.externalId,
            metadata: { seededBy: mockSourceId },
          })
          .returning(),
    );
    counterpartyByExternalId.set(seed.externalId, counterparty);
  }

  const driverByEmail = new Map<string, typeof drivers.$inferSelect>();
  for (const seed of driverSeeds) {
    const driver = await firstOrInsert(
      () =>
        db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, organization.id),
              eq(drivers.email, seed.email),
            ),
          )
          .limit(1),
      () =>
        db
          .insert(drivers)
          .values({
            organizationId: organization.id,
            name: seed.name,
            email: seed.email,
            status: "available",
            metadata: { seededBy: mockSourceId },
          })
          .returning(),
    );
    driverByEmail.set(seed.email, driver);
  }

  const vehicleByUnit = new Map<string, typeof vehicles.$inferSelect>();
  for (const seed of vehicleSeeds) {
    const homeLocation = locationByKey.get(seed.locationKey);
    if (!homeLocation) throw new Error(`Missing location ${seed.locationKey}.`);

    const vehicle = (
      await db
        .insert(vehicles)
        .values({
          organizationId: organization.id,
          unitNumber: seed.unitNumber,
          equipmentType: seed.equipmentType,
          status: seed.status,
          expectedAvailableAt:
            seed.status === "available_soon" ? hoursFromNow(2) : null,
          homeLocationId: homeLocation.id,
          metadata: {
            seededBy: mockSourceId,
            costPerMile: seed.costPerMile,
            currentLocationKey: seed.locationKey,
          },
        })
        .onConflictDoUpdate({
          target: [vehicles.organizationId, vehicles.unitNumber],
          set: {
            equipmentType: seed.equipmentType,
            status: seed.status,
            expectedAvailableAt:
              seed.status === "available_soon" ? hoursFromNow(2) : null,
            homeLocationId: homeLocation.id,
            metadata: {
              seededBy: mockSourceId,
              costPerMile: seed.costPerMile,
              currentLocationKey: seed.locationKey,
            },
            updatedAt: new Date(),
          },
        })
        .returning()
    )[0];

    if (!vehicle) throw new Error(`Expected vehicle ${seed.unitNumber}.`);
    vehicleByUnit.set(seed.unitNumber, vehicle);

    await db.insert(vehicleLocationEvents).values({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      locationId: homeLocation.id,
      sourceId: mockSourceId,
      externalId: `${mockSourceId}:${seed.unitNumber}`,
      latitude: homeLocation.latitude,
      longitude: homeLocation.longitude,
      occurredAt: hoursFromNow(-1),
      lastSeenAt: hoursFromNow(-1),
      rawPayload: { seedKey: seed.unitNumber },
      payloadHash: `${mockSourceId}:${seed.unitNumber}:${Date.now()}`,
    });
  }

  const driversInOrder = driverSeeds.map((seed) => {
    const driver = driverByEmail.get(seed.email);
    if (!driver) throw new Error(`Missing driver ${seed.email}.`);
    return driver;
  });

  for (const [index, vehicleSeed] of vehicleSeeds.entries()) {
    const vehicle = vehicleByUnit.get(vehicleSeed.unitNumber);
    const driver = driversInOrder[index];
    if (!vehicle || !driver) continue;

    const existing = await db
      .select()
      .from(driverVehicleAssignments)
      .where(
        and(
          eq(driverVehicleAssignments.organizationId, organization.id),
          eq(driverVehicleAssignments.driverId, driver.id),
          eq(driverVehicleAssignments.vehicleId, vehicle.id),
          eq(driverVehicleAssignments.status, "active"),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      await db.insert(driverVehicleAssignments).values({
        organizationId: organization.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        status: "active",
        metadata: { seededBy: mockSourceId },
      });
    }
  }

  const seededLoads = [];
  for (const seed of loadSeeds) {
    const pickupLocation = locationByKey.get(seed.pickupLocationKey);
    const deliveryLocation = locationByKey.get(seed.deliveryLocationKey);
    const counterparty = counterpartyByExternalId.get(
      seed.counterpartyExternalId,
    );
    if (!pickupLocation || !deliveryLocation || !counterparty) {
      throw new Error(`Missing relation for ${seed.externalId}.`);
    }

    let existingLoad = await firstOrInsert(
      () =>
        db
          .select()
          .from(loads)
          .where(
            and(
              eq(loads.organizationId, organization.id),
              eq(loads.sourceId, mockSourceId),
              eq(loads.externalId, seed.externalId),
            ),
          )
          .limit(1),
      () =>
        db
          .insert(loads)
          .values({
            organizationId: organization.id,
            loadSourceId: source.id,
            counterpartyId: counterparty.id,
            sourceId: mockSourceId,
            externalId: seed.externalId,
            referenceNumber: seed.referenceNumber,
            status: "available",
            equipmentType: seed.equipmentType,
            cargoType: seed.cargoType,
            weightLbs: seed.weightLbs,
            rateAmount: seed.rateAmount,
            currency: "USD",
            distanceMiles: seed.distanceMiles,
            pickupStartsAt: hoursFromNow(seed.pickupOffsetHours),
            pickupEndsAt: hoursFromNow(seed.pickupOffsetHours + 4),
            deliveryStartsAt: hoursFromNow(seed.deliveryOffsetHours),
            deliveryEndsAt: hoursFromNow(seed.deliveryOffsetHours + 6),
            rawPayload: { seedKey: seed.externalId },
            payloadHash: `${mockSourceId}:${seed.externalId}`,
            lastSeenAt: new Date(),
            metadata: { seededBy: mockSourceId },
          })
          .returning(),
    );

    if (!existingLoad) throw new Error(`Expected load ${seed.externalId}.`);

    if (existingLoad.status === "available") {
      existingLoad =
        (
          await db
            .update(loads)
            .set({
              loadSourceId: source.id,
              counterpartyId: counterparty.id,
              referenceNumber: seed.referenceNumber,
              equipmentType: seed.equipmentType,
              cargoType: seed.cargoType,
              weightLbs: seed.weightLbs,
              rateAmount: seed.rateAmount,
              distanceMiles: seed.distanceMiles,
              pickupStartsAt: hoursFromNow(seed.pickupOffsetHours),
              pickupEndsAt: hoursFromNow(seed.pickupOffsetHours + 4),
              deliveryStartsAt: hoursFromNow(seed.deliveryOffsetHours),
              deliveryEndsAt: hoursFromNow(seed.deliveryOffsetHours + 6),
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(loads.id, existingLoad.id))
            .returning()
        )[0] ?? existingLoad;
    }

    seededLoads.push(existingLoad);

    await db
      .insert(loadStops)
      .values([
        {
          organizationId: organization.id,
          loadId: existingLoad.id,
          locationId: pickupLocation.id,
          stopType: "pickup",
          sequence: 1,
          appointmentStartsAt: hoursFromNow(seed.pickupOffsetHours),
          appointmentEndsAt: hoursFromNow(seed.pickupOffsetHours + 4),
          instructions: "Mock pickup appointment for Stage 1B testing.",
          rawPayload: { seedKey: `${seed.externalId}:pickup` },
          payloadHash: `${mockSourceId}:${seed.externalId}:pickup`,
        },
        {
          organizationId: organization.id,
          loadId: existingLoad.id,
          locationId: deliveryLocation.id,
          stopType: "dropoff",
          sequence: 2,
          appointmentStartsAt: hoursFromNow(seed.deliveryOffsetHours),
          appointmentEndsAt: hoursFromNow(seed.deliveryOffsetHours + 6),
          instructions: "Mock delivery appointment for Stage 1B testing.",
          rawPayload: { seedKey: `${seed.externalId}:dropoff` },
          payloadHash: `${mockSourceId}:${seed.externalId}:dropoff`,
        },
      ])
      .onConflictDoUpdate({
        target: [loadStops.loadId, loadStops.sequence],
        set: { updatedAt: new Date() },
      });
  }

  return {
    organizationId: organization.id,
    dispatcherUserId: dispatcher.id,
    vehicles: vehicleByUnit.size,
    drivers: driverByEmail.size,
    loads: seededLoads.length,
    loadSourceId: source.id,
  };
}

export const dispatcherMockData = {
  mockSourceId,
  organizationSlug,
};
