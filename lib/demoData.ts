export type Coordinates = {
  lat: number;
  lng: number;
  city: string;
  country: string;
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
  equipment: string;
  status: VehicleStatus;
  location: Coordinates;
  preferredLane: string;
  hoursUntilAvailable: number;
  costPerKm: number;
};

export type ShipmentStatus = "posted" | "recommended" | "reserved";

export type Shipment = {
  id: string;
  reference: string;
  status: ShipmentStatus;
  origin: Coordinates;
  destination: Coordinates;
  commodity: string;
  weightKg: number;
  revenue: number;
  currency: "USDC" | "EURC";
  pickupWindow: string;
};

export const vehicles: Vehicle[] = [
  {
    id: "truck-berlin-01",
    label: "DE-101 Refrigerated Truck",
    driver: "M. Weber",
    equipment: "Reefer 13.6m",
    status: "available",
    location: {
      lat: 52.52,
      lng: 13.405,
      city: "Berlin",
      country: "Germany",
    },
    preferredLane: "Germany -> Benelux -> Germany",
    hoursUntilAvailable: 0,
    costPerKm: 0.72,
  },
  {
    id: "truck-prague-02",
    label: "CZ-204 Curtain Sider",
    driver: "P. Novak",
    equipment: "Curtain sider 13.6m",
    status: "available",
    location: {
      lat: 50.0755,
      lng: 14.4378,
      city: "Prague",
      country: "Czechia",
    },
    preferredLane: "Czechia -> Germany -> Poland",
    hoursUntilAvailable: 1.5,
    costPerKm: 0.64,
  },
  {
    id: "truck-warsaw-03",
    label: "PL-318 Box Truck",
    driver: "A. Kowalski",
    equipment: "Box truck 7.5t",
    status: "delayed",
    location: {
      lat: 52.2297,
      lng: 21.0122,
      city: "Warsaw",
      country: "Poland",
    },
    preferredLane: "Poland -> Germany",
    hoursUntilAvailable: 3,
    costPerKm: 0.58,
  },
];

export const shipments: Shipment[] = [
  {
    id: "shipment-hamburg-rotterdam-01",
    reference: "SHP-HAM-RTM-001",
    status: "posted",
    origin: {
      lat: 53.5511,
      lng: 9.9937,
      city: "Hamburg",
      country: "Germany",
    },
    destination: {
      lat: 51.9244,
      lng: 4.4777,
      city: "Rotterdam",
      country: "Netherlands",
    },
    commodity: "Medical equipment",
    weightKg: 9600,
    revenue: 1250,
    currency: "USDC",
    pickupWindow: "Today 16:00-19:00",
  },
  {
    id: "shipment-dresden-vienna-02",
    reference: "SHP-DRS-VIE-002",
    status: "posted",
    origin: {
      lat: 51.0504,
      lng: 13.7373,
      city: "Dresden",
      country: "Germany",
    },
    destination: {
      lat: 48.2082,
      lng: 16.3738,
      city: "Vienna",
      country: "Austria",
    },
    commodity: "Automotive parts",
    weightKg: 14200,
    revenue: 980,
    currency: "EURC",
    pickupWindow: "Tomorrow 08:00-11:00",
  },
  {
    id: "shipment-poznan-berlin-03",
    reference: "SHP-POZ-BER-003",
    status: "posted",
    origin: {
      lat: 52.4064,
      lng: 16.9252,
      city: "Poznan",
      country: "Poland",
    },
    destination: {
      lat: 52.52,
      lng: 13.405,
      city: "Berlin",
      country: "Germany",
    },
    commodity: "Retail pallets",
    weightKg: 6800,
    revenue: 620,
    currency: "USDC",
    pickupWindow: "Today 18:00-22:00",
  },
];

export function findVehicle(vehicleId: string) {
  return vehicles.find((vehicle) => vehicle.id === vehicleId);
}

export function findShipment(shipmentId: string) {
  return shipments.find((shipment) => shipment.id === shipmentId);
}
