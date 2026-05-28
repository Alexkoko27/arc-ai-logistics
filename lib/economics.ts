import {
  fuelPricePerGallonByState,
  Shipment,
  Vehicle,
} from "@/lib/demoData";
import { getHistoricalLaneData } from "@/lib/historicalLaneData";

export type WaitingRiskLevel = "low" | "medium" | "high";

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
  estimatedDetentionHours: number;
  detentionRatePerHour: number;
  estimatedDetentionCost: number;
  estimatedTollCost: number;
  waitingRiskLevel: WaitingRiskLevel;
  waitingCostEstimate: number;
  trueNetProfit: number;
  trueMarginPercent: number;
  currency: Shipment["currency"];
};

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function hoursBetween(startIso: string, endIso: string) {
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 36e5);
}

function estimateTollCost(shipment: Shipment, totalMiles: number) {
  const touchesIllinois =
    shipment.origin.state === "Illinois" || shipment.destination.state === "Illinois";
  const longHaul = totalMiles >= 800;

  if (touchesIllinois) return round(totalMiles * 0.08 + 18);
  if (longHaul) return round(totalMiles * 0.035 + 12);

  return round(15);
}

function estimateWaitingRisk(shipment: Shipment): WaitingRiskLevel {
  const pickupWindowHours = hoursBetween(
    shipment.pickupWindowStart,
    shipment.pickupWindowEnd,
  );
  const deliveryWindowHours = hoursBetween(
    shipment.deliveryWindowStart,
    shipment.deliveryWindowEnd,
  );

  if (pickupWindowHours <= 4 || deliveryWindowHours <= 4) return "high";
  if (pickupWindowHours <= 6 || deliveryWindowHours <= 6) return "medium";

  return "low";
}

function estimateWaitingCost(waitingRiskLevel: WaitingRiskLevel) {
  if (waitingRiskLevel === "high") return 175;
  if (waitingRiskLevel === "medium") return 90;

  return 35;
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
  const historicalLane = getHistoricalLaneData(shipment.origin, shipment.destination);
  const detentionRatePerHour = 50;
  const estimatedDetentionHours = Math.max(
    0.5,
    historicalLane.typicalDetentionHours + (shipment.weightLbs >= 42000 ? 0.5 : 0),
  );
  const estimatedDetentionCost = estimatedDetentionHours * detentionRatePerHour;
  const estimatedTollCost = estimateTollCost(shipment, totalMiles);
  const waitingRiskLevel = estimateWaitingRisk(shipment);
  const waitingCostEstimate = estimateWaitingCost(waitingRiskLevel);
  const trueNetProfit =
    shipment.revenue -
    fuelCost -
    driverCost -
    estimatedDetentionCost -
    estimatedTollCost -
    waitingCostEstimate;
  const trueMarginPercent = (trueNetProfit / shipment.revenue) * 100;

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
    estimatedDetentionHours: round(estimatedDetentionHours, 1),
    detentionRatePerHour,
    estimatedDetentionCost: round(estimatedDetentionCost),
    estimatedTollCost,
    waitingRiskLevel,
    waitingCostEstimate,
    trueNetProfit: round(trueNetProfit),
    trueMarginPercent: round(trueMarginPercent, 1),
    currency: shipment.currency,
  };
}
