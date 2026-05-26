export type LocationState = "Texas" | "Illinois" | "Georgia";

export type Coordinates = {
  lat: number;
  lng: number;
  city: string;
  state: LocationState;
  country: "USA";
};

export type VehicleStatus =
  | "available"
  | "assigned"
  | "waiting_at_pickup"
  | "delayed";

export type Vehicle = {
  id: string;
  label: string;
  driver: string;
  equipment: "Dry Van";
  status: VehicleStatus;
  location: Coordinates;
  availableAt: string;
  mpg: number;
  driverRatePerMile: number;
  preferredLanes: string[];
};

export type ShipmentStatus = "posted" | "recommended" | "reserved";

export type Shipment = {
  id: string;
  reference: string;
  status: ShipmentStatus;
  origin: Coordinates;
  destination: Coordinates;
  commodity: string;
  weightLbs: number;
  revenue: number;
  currency: "USDC";
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  equipment: "Dry Van";
};

export const fuelPricePerGallonByState: Record<LocationState, number> = {
  Texas: 3.65,
  Illinois: 4.05,
  Georgia: 3.75,
};

export const vehicles: Vehicle[] = [
  {
    id: "truck-dallas-01",
    label: "TX-101 Dallas Dry Van",
    driver: "M. Carter",
    equipment: "Dry Van",
    status: "available",
    location: {
      lat: 32.7767,
      lng: -96.797,
      city: "Dallas",
      state: "Texas",
      country: "USA",
    },
    availableAt: "2026-05-26T14:00:00Z",
    mpg: 6.8,
    driverRatePerMile: 0.7,
    preferredLanes: ["Texas -> Georgia", "Texas -> Illinois"],
  },
  {
    id: "truck-joliet-02",
    label: "IL-204 Joliet Dry Van",
    driver: "R. Mitchell",
    equipment: "Dry Van",
    status: "available",
    location: {
      lat: 41.525,
      lng: -88.0817,
      city: "Joliet",
      state: "Illinois",
      country: "USA",
    },
    availableAt: "2026-05-26T16:00:00Z",
    mpg: 7.1,
    driverRatePerMile: 0.7,
    preferredLanes: ["Illinois -> Texas", "Illinois -> Georgia"],
  },
  {
    id: "truck-atlanta-03",
    label: "GA-318 Atlanta Dry Van",
    driver: "D. Brooks",
    equipment: "Dry Van",
    status: "delayed",
    location: {
      lat: 33.749,
      lng: -84.388,
      city: "Atlanta",
      state: "Georgia",
      country: "USA",
    },
    availableAt: "2026-05-26T20:00:00Z",
    mpg: 6.6,
    driverRatePerMile: 0.7,
    preferredLanes: ["Georgia -> Texas", "Georgia -> Illinois"],
  },
];

export const shipments: Shipment[] = [
  {
    id: "load-dallas-chicago-001",
    reference: "LOAD-DAL-CHI-001",
    status: "posted",
    origin: {
      lat: 32.7767,
      lng: -96.797,
      city: "Dallas",
      state: "Texas",
      country: "USA",
    },
    destination: {
      lat: 41.8781,
      lng: -87.6298,
      city: "Chicago",
      state: "Illinois",
      country: "USA",
    },
    commodity: "Retail dry goods",
    weightLbs: 32000,
    revenue: 2450,
    currency: "USDC",
    pickupWindowStart: "2026-05-27T14:00:00Z",
    pickupWindowEnd: "2026-05-27T18:00:00Z",
    deliveryWindowStart: "2026-05-29T13:00:00Z",
    deliveryWindowEnd: "2026-05-29T17:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-houston-atlanta-002",
    reference: "LOAD-HOU-ATL-002",
    status: "posted",
    origin: {
      lat: 29.7604,
      lng: -95.3698,
      city: "Houston",
      state: "Texas",
      country: "USA",
    },
    destination: {
      lat: 33.749,
      lng: -84.388,
      city: "Atlanta",
      state: "Georgia",
      country: "USA",
    },
    commodity: "Consumer packaging",
    weightLbs: 28000,
    revenue: 1850,
    currency: "USDC",
    pickupWindowStart: "2026-05-27T12:00:00Z",
    pickupWindowEnd: "2026-05-27T16:00:00Z",
    deliveryWindowStart: "2026-05-28T18:00:00Z",
    deliveryWindowEnd: "2026-05-28T23:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-austin-savannah-003",
    reference: "LOAD-AUS-SAV-003",
    status: "posted",
    origin: {
      lat: 30.2672,
      lng: -97.7431,
      city: "Austin",
      state: "Texas",
      country: "USA",
    },
    destination: {
      lat: 32.0809,
      lng: -81.0912,
      city: "Savannah",
      state: "Georgia",
      country: "USA",
    },
    commodity: "E-commerce pallets",
    weightLbs: 36000,
    revenue: 2200,
    currency: "USDC",
    pickupWindowStart: "2026-05-28T13:00:00Z",
    pickupWindowEnd: "2026-05-28T17:00:00Z",
    deliveryWindowStart: "2026-05-30T12:00:00Z",
    deliveryWindowEnd: "2026-05-30T18:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-sanantonio-chicago-004",
    reference: "LOAD-SAT-CHI-004",
    status: "posted",
    origin: {
      lat: 29.4241,
      lng: -98.4936,
      city: "San Antonio",
      state: "Texas",
      country: "USA",
    },
    destination: {
      lat: 41.8781,
      lng: -87.6298,
      city: "Chicago",
      state: "Illinois",
      country: "USA",
    },
    commodity: "Paper products",
    weightLbs: 42000,
    revenue: 2650,
    currency: "USDC",
    pickupWindowStart: "2026-05-28T15:00:00Z",
    pickupWindowEnd: "2026-05-28T20:00:00Z",
    deliveryWindowStart: "2026-05-31T14:00:00Z",
    deliveryWindowEnd: "2026-05-31T20:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-chicago-dallas-005",
    reference: "LOAD-CHI-DAL-005",
    status: "posted",
    origin: {
      lat: 41.8781,
      lng: -87.6298,
      city: "Chicago",
      state: "Illinois",
      country: "USA",
    },
    destination: {
      lat: 32.7767,
      lng: -96.797,
      city: "Dallas",
      state: "Texas",
      country: "USA",
    },
    commodity: "Food-grade packaging",
    weightLbs: 30000,
    revenue: 2380,
    currency: "USDC",
    pickupWindowStart: "2026-05-27T17:00:00Z",
    pickupWindowEnd: "2026-05-27T22:00:00Z",
    deliveryWindowStart: "2026-05-29T18:00:00Z",
    deliveryWindowEnd: "2026-05-30T00:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-joliet-atlanta-006",
    reference: "LOAD-JOL-ATL-006",
    status: "posted",
    origin: {
      lat: 41.525,
      lng: -88.0817,
      city: "Joliet",
      state: "Illinois",
      country: "USA",
    },
    destination: {
      lat: 33.749,
      lng: -84.388,
      city: "Atlanta",
      state: "Georgia",
      country: "USA",
    },
    commodity: "Appliance parts",
    weightLbs: 35000,
    revenue: 1725,
    currency: "USDC",
    pickupWindowStart: "2026-05-27T11:00:00Z",
    pickupWindowEnd: "2026-05-27T15:00:00Z",
    deliveryWindowStart: "2026-05-28T20:00:00Z",
    deliveryWindowEnd: "2026-05-29T02:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-atlanta-houston-007",
    reference: "LOAD-ATL-HOU-007",
    status: "posted",
    origin: {
      lat: 33.749,
      lng: -84.388,
      city: "Atlanta",
      state: "Georgia",
      country: "USA",
    },
    destination: {
      lat: 29.7604,
      lng: -95.3698,
      city: "Houston",
      state: "Texas",
      country: "USA",
    },
    commodity: "Building materials",
    weightLbs: 44000,
    revenue: 1950,
    currency: "USDC",
    pickupWindowStart: "2026-05-27T19:00:00Z",
    pickupWindowEnd: "2026-05-28T00:00:00Z",
    deliveryWindowStart: "2026-05-29T13:00:00Z",
    deliveryWindowEnd: "2026-05-29T19:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-savannah-dallas-008",
    reference: "LOAD-SAV-DAL-008",
    status: "posted",
    origin: {
      lat: 32.0809,
      lng: -81.0912,
      city: "Savannah",
      state: "Georgia",
      country: "USA",
    },
    destination: {
      lat: 32.7767,
      lng: -96.797,
      city: "Dallas",
      state: "Texas",
      country: "USA",
    },
    commodity: "Import warehouse freight",
    weightLbs: 39000,
    revenue: 2300,
    currency: "USDC",
    pickupWindowStart: "2026-05-28T12:00:00Z",
    pickupWindowEnd: "2026-05-28T18:00:00Z",
    deliveryWindowStart: "2026-05-30T17:00:00Z",
    deliveryWindowEnd: "2026-05-30T23:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-augusta-chicago-009",
    reference: "LOAD-AUG-CHI-009",
    status: "posted",
    origin: {
      lat: 33.4735,
      lng: -82.0105,
      city: "Augusta",
      state: "Georgia",
      country: "USA",
    },
    destination: {
      lat: 41.8781,
      lng: -87.6298,
      city: "Chicago",
      state: "Illinois",
      country: "USA",
    },
    commodity: "Textile rolls",
    weightLbs: 26000,
    revenue: 1800,
    currency: "USDC",
    pickupWindowStart: "2026-05-28T10:00:00Z",
    pickupWindowEnd: "2026-05-28T14:00:00Z",
    deliveryWindowStart: "2026-05-30T12:00:00Z",
    deliveryWindowEnd: "2026-05-30T18:00:00Z",
    equipment: "Dry Van",
  },
  {
    id: "load-fortworth-atlanta-010",
    reference: "LOAD-FTW-ATL-010",
    status: "posted",
    origin: {
      lat: 32.7555,
      lng: -97.3308,
      city: "Fort Worth",
      state: "Texas",
      country: "USA",
    },
    destination: {
      lat: 33.749,
      lng: -84.388,
      city: "Atlanta",
      state: "Georgia",
      country: "USA",
    },
    commodity: "General merchandise",
    weightLbs: 31000,
    revenue: 2050,
    currency: "USDC",
    pickupWindowStart: "2026-05-29T13:00:00Z",
    pickupWindowEnd: "2026-05-29T18:00:00Z",
    deliveryWindowStart: "2026-05-31T14:00:00Z",
    deliveryWindowEnd: "2026-05-31T20:00:00Z",
    equipment: "Dry Van",
  },
];

export function findVehicle(vehicleId: string) {
  return vehicles.find((vehicle) => vehicle.id === vehicleId);
}

export function findShipment(shipmentId: string) {
  return shipments.find((shipment) => shipment.id === shipmentId);
}
