import {
  fuelPricePerGallonByState,
  Shipment,
  Vehicle,
} from "@/lib/demoData";

export type RouteEconomics = {
  revenue: number;
  deadheadMiles: number;
  loadedMiles: number;
  totalMiles: number;
  fuelPricePerGallon: number;
  fuelGallons: number;
  fuelCost: number;
  driverCost: number;
  operatingCost: number;
  grossProfit: number;
  rpmLoaded: number;
  rpmTotal: number;
  marginPercent: number;
  currency: Shipment["currency"];
};

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

export function getFuelPricePerGallon(shipment: Shipment) {
  const originFuel = fuelPricePerGallonByState[shipment.origin.state];
  const destinationFuel = fuelPricePerGallonByState[shipment.destination.state];

  return round((originFuel + destinationFuel) / 2);
}

export function calculateTruckingEconomics({
  truck,
  shipment,
  deadheadMiles,
  loadedMiles,
}: {
  truck: Vehicle;
  shipment: Shipment;
  deadheadMiles: number;
  loadedMiles: number;
}): RouteEconomics {
  const totalMiles = deadheadMiles + loadedMiles;
  const fuelPricePerGallon = getFuelPricePerGallon(shipment);
  const fuelGallons = totalMiles / truck.mpg;
  const fuelCost = fuelGallons * fuelPricePerGallon;
  const driverCost = totalMiles * truck.driverRatePerMile;
  const operatingCost = fuelCost + driverCost;
  const grossProfit = shipment.revenue - operatingCost;
  const rpmLoaded = shipment.revenue / Math.max(loadedMiles, 1);
  const rpmTotal = shipment.revenue / Math.max(totalMiles, 1);
  const marginPercent = (grossProfit / shipment.revenue) * 100;

  return {
    revenue: shipment.revenue,
    deadheadMiles: round(deadheadMiles, 1),
    loadedMiles: round(loadedMiles, 1),
    totalMiles: round(totalMiles, 1),
    fuelPricePerGallon,
    fuelGallons: round(fuelGallons, 1),
    fuelCost: round(fuelCost),
    driverCost: round(driverCost),
    operatingCost: round(operatingCost),
    grossProfit: round(grossProfit),
    rpmLoaded: round(rpmLoaded),
    rpmTotal: round(rpmTotal),
    marginPercent: round(marginPercent, 1),
    currency: shipment.currency,
  };
}
