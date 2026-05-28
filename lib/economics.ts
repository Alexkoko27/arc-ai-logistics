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

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safePositiveNumber(value: unknown, fallback = 1) {
  const numberValue = safeNumber(value, fallback);

  return numberValue > 0 ? numberValue : fallback;
}

function safeDivide(numerator: unknown, denominator: unknown, fallback = 0) {
  const safeDenominator = safeNumber(denominator, 0);

  if (safeDenominator === 0) return fallback;

  const result = safeNumber(numerator, 0) / safeDenominator;

  return Number.isFinite(result) ? result : fallback;
}

function round(value: unknown, decimals = 2) {
  const numberValue = safeNumber(value, 0);

  return Number(numberValue.toFixed(decimals));
}

function hoursBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

  return Math.max(0, (end - start) / 36e5);
}

function estimateTollCost(shipment: Shipment, totalMiles: number) {
  const safeTotalMiles = safeNumber(totalMiles, 0);
  const touchesIllinois =
    shipment.origin.state === "Illinois" || shipment.destination.state === "Illinois";
  const longHaul = safeTotalMiles >= 800;

  if (touchesIllinois) return round(safeTotalMiles * 0.08 + 18);
  if (longHaul) return round(safeTotalMiles * 0.035 + 12);

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

  return round((safeNumber(originFuel, 3.85) + safeNumber(destinationFuel, 3.85)) / 2);
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
  const safeDeadheadMiles = Math.max(0, safeNumber(deadheadMiles, 0));
  const safeLoadedMiles = Math.max(0, safeNumber(loadedMiles, 0));
  const totalMiles = safeDeadheadMiles + safeLoadedMiles;
  const safeRevenue = safePositiveNumber(shipment.revenue, 1);
  const fuelPricePerGallon = getFuelPricePerGallon(shipment);
  const truckMpg = safePositiveNumber(truck.mpg, 6.5);
  const driverRatePerMile = safeNumber(truck.driverRatePerMile, 0.7);
  const fuelGallons = safeDivide(totalMiles, truckMpg, 0);
  const fuelCost = fuelGallons * fuelPricePerGallon;
  const driverCost = totalMiles * driverRatePerMile;
  const operatingCost = fuelCost + driverCost;
  const grossProfit = safeRevenue - operatingCost;
  const rpmLoaded = safeDivide(safeRevenue, Math.max(safeLoadedMiles, 1), 0);
  const rpmTotal = safeDivide(safeRevenue, Math.max(totalMiles, 1), 0);
  const marginPercent = safeDivide(grossProfit, safeRevenue, 0) * 100;
  const historicalLane = getHistoricalLaneData(shipment.origin, shipment.destination);
  const detentionRatePerHour = 50;
  const estimatedDetentionHours = Math.max(
    0.5,
    safeNumber(historicalLane.typicalDetentionHours, 1.5) +
      (safeNumber(shipment.weightLbs, 0) >= 42000 ? 0.5 : 0),
  );
  const estimatedDetentionCost = estimatedDetentionHours * detentionRatePerHour;
  const estimatedTollCost = estimateTollCost(shipment, totalMiles);
  const waitingRiskLevel = estimateWaitingRisk(shipment);
  const waitingCostEstimate = estimateWaitingCost(waitingRiskLevel);
  const trueNetProfit =
    safeRevenue -
    fuelCost -
    driverCost -
    estimatedDetentionCost -
    estimatedTollCost -
    waitingCostEstimate;
  const trueMarginPercent = safeDivide(trueNetProfit, safeRevenue, 0) * 100;

  return {
    revenue: round(safeRevenue),
    deadheadMiles: round(safeDeadheadMiles, 1),
    loadedMiles: round(safeLoadedMiles, 1),
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
