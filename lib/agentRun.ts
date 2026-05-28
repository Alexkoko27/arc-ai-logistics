import { analyzeRouteWithGemini } from "@/lib/gemini";
import { estimateFallbackDistanceMiles, getRouteMetrics } from "@/lib/googleRoutes";
import { calculateTruckingEconomics, RouteEconomics } from "@/lib/economics";
import { getHistoricalLaneData, HistoricalLaneData } from "@/lib/historicalLaneData";
import {
  getFallbackWeatherRisk,
  getWeatherRisk,
  WeatherRiskResult,
} from "@/lib/weatherRisk";
import {
  findShipment,
  findVehicle,
  shipments,
  Shipment,
  Vehicle,
  vehicles,
} from "@/lib/demoData";

type AgentStatus = "complete" | "warning";

type AgentResult = {
  name: string;
  status: AgentStatus;
  summary: string;
  details: Record<string, string | number | boolean>;
};

export type RiskResult = {
  level: "low" | "medium" | "high";
  score: number;
  factors: string[];
  weather: WeatherRiskResult;
  historicalLane: HistoricalLaneData;
};

export type MatchRecommendation = {
  decision: "BOOK" | "WAIT" | "SKIP";
  confidence: number;
  reason: string;
  source: string;
};

export type RankedTruckLoadMatch = {
  loadReference: string;
  shipmentId: string;
  truckId: string;
  truckLabel: string;
  origin: string;
  destination: string;
  economics: RouteEconomics;
  risk: RiskResult;
  recommendation: MatchRecommendation;
  historicalLane: HistoricalLaneData;
  weatherRisk: WeatherRiskResult;
  whyRanked: string[];
  feasible: boolean;
  rankScore: number;
};

export type AgentRunResult = {
  id: string;
  vehicle: Vehicle;
  shipment: Shipment;
  agents: AgentResult[];
  economics: RouteEconomics & {
    eta: string;
    routeSource: string;
  };
  risk: RiskResult;
  weatherRisk: WeatherRiskResult;
  historicalLane: HistoricalLaneData;
  whyRanked: string[];
  recommendation: MatchRecommendation;
  payment: {
    feeAmount: string;
    feeCurrency: "USDC";
    status: "pending";
  };
};

function createRunId(vehicleId: string, shipmentId: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `run-${vehicleId}-${shipmentId}-${suffix}`;
}

function getDemoVehicle(vehicleId?: string) {
  if (vehicleId) return findVehicle(vehicleId);

  return (
    vehicles.find((vehicle) => vehicle.status === "available") ?? vehicles[0]
  );
}

function formatLocation(location: Shipment["origin"]) {
  return `${location.city}, ${location.state}`;
}

function estimateTravelHours(totalMiles: number) {
  return totalMiles / 58;
}

function isPickupFeasible(vehicle: Vehicle, shipment: Shipment, deadheadMiles: number) {
  const arrivalTime =
    new Date(vehicle.availableAt).getTime() + estimateTravelHours(deadheadMiles) * 36e5;

  return arrivalTime <= new Date(shipment.pickupWindowEnd).getTime();
}

function isDeliveryFeasible(shipment: Shipment, totalMiles: number) {
  const pickupStart = new Date(shipment.pickupWindowStart).getTime();
  const deliveryEnd = new Date(shipment.deliveryWindowEnd).getTime();
  const travelTime = estimateTravelHours(totalMiles) * 36e5;
  const appointmentBuffer = 6 * 36e5;

  return pickupStart + travelTime + appointmentBuffer <= deliveryEnd;
}

function calculateRisk({
  vehicle,
  shipment,
  economics,
  weatherRisk,
  historicalLane,
}: {
  vehicle: Vehicle;
  shipment: Shipment;
  economics: RouteEconomics;
  weatherRisk: WeatherRiskResult;
  historicalLane: HistoricalLaneData;
}): RiskResult {
  const factors: string[] = [];
  let score = 12;

  if (vehicle.status !== "available") {
    score += 28;
    factors.push(`Vehicle availability risk: truck status is ${vehicle.status}.`);
  }

  if (!isPickupFeasible(vehicle, shipment, economics.deadheadMiles)) {
    score += 20;
    factors.push("Pickup appointment risk: truck may miss the pickup window.");
  }

  if (economics.deadheadMiles > 250) {
    score += 20;
    factors.push("Long deadhead risk: more than 250 deadhead miles.");
  } else if (economics.deadheadMiles > 150) {
    score += 10;
    factors.push("Moderate deadhead risk: more than 150 deadhead miles.");
  }

  if (shipment.weightLbs >= 42000) {
    score += 12;
    factors.push("Heavy load risk: payload is near upper dry van planning range.");
  }

  if (!isDeliveryFeasible(shipment, economics.totalMiles)) {
    score += 18;
    factors.push("Delivery appointment risk: linehaul timing is tight.");
  }

  if (economics.trueNetProfit < 150) {
    score += 18;
    factors.push("Low profit risk: true net profit is below dispatch comfort range.");
  }

  if (economics.trueMarginPercent < 10) {
    score += 12;
    factors.push("Weak true margin risk after detention, toll, and waiting estimates.");
  }

  if (economics.rpmTotal < 1.35) {
    score += 14;
    factors.push("Low RPM risk: total-mile revenue is weak after deadhead.");
  }

  if (historicalLane.delayRatePercent >= 25) {
    score += 8;
    factors.push("Historical delay risk: this lane has elevated delay history.");
  }

  if (historicalLane.reloadStrength === "low") {
    score += 6;
    factors.push("Historical reload risk: weak reload market after delivery.");
  }

  if (historicalLane.laneScore < 55) {
    score += 10;
    factors.push("Historical lane risk: lane score is below preferred threshold.");
  }

  score += weatherRisk.riskScoreDelta;
  factors.push(`Weather risk: ${weatherRisk.summary}`);
  factors.push(...weatherRisk.reasons.slice(0, 2));

  if (factors.length === 0) {
    factors.push("No major demo risk factors detected.");
  }

  const normalizedScore = Math.min(100, Math.round(score));

  return {
    level:
      normalizedScore >= 65 ? "high" : normalizedScore >= 38 ? "medium" : "low",
    score: normalizedScore,
    factors,
    weather: weatherRisk,
    historicalLane,
  };
}

function localRecommendation(
  economics: RouteEconomics,
  riskScore: number,
): Omit<MatchRecommendation, "source"> {
  if (
    economics.trueNetProfit > 300 &&
    economics.trueMarginPercent >= 14 &&
    economics.rpmTotal >= 1.7 &&
    riskScore < 60
  ) {
    return {
      decision: "BOOK",
      confidence: 82,
      reason:
        "True net profit, total-mile RPM, and risk profile are strong enough for dispatch.",
    };
  }

  if (economics.trueNetProfit > 75 && economics.rpmTotal >= 1.3 && riskScore < 76) {
    return {
      decision: "WAIT",
      confidence: 64,
      reason:
        "The load is possible, but dispatcher should review timing, deadhead, weather, or rate improvement.",
    };
  }

  return {
    decision: "SKIP",
    confidence: 71,
    reason:
      "Expected true net profit, RPM, or risk profile is not strong enough for this truck-load match.",
  };
}

function parseAiDecision(
  ai: Awaited<ReturnType<typeof analyzeRouteWithGemini>>,
  fallback: Omit<MatchRecommendation, "source">,
): MatchRecommendation {
  if (typeof ai === "string") {
    return {
      ...fallback,
      source: "local-fallback",
    };
  }

  const recommendation = ai.recommendation?.toUpperCase();
  const decision =
    recommendation === "BOOK" || recommendation === "WAIT" || recommendation === "SKIP"
      ? recommendation
      : fallback.decision;

  return {
    decision,
    confidence:
      typeof ai.confidence === "number" ? ai.confidence : fallback.confidence,
    reason: ai.reason ?? fallback.reason,
    source: ai.source ?? "gemini",
  };
}

function createWhyRanked({
  economics,
  risk,
  historicalLane,
  weatherRisk,
  feasible,
}: {
  economics: RouteEconomics;
  risk: RiskResult;
  historicalLane: HistoricalLaneData;
  weatherRisk: WeatherRiskResult;
  feasible: boolean;
}) {
  const reasons: string[] = [];

  if (economics.deadheadMiles <= 100) reasons.push("Low deadhead miles.");
  if (economics.rpmTotal >= 1.7) reasons.push("Strong total RPM.");
  if (economics.trueNetProfit > 300) reasons.push("Positive true net profit after estimated costs.");
  if (weatherRisk.riskLevel === "low") reasons.push("Acceptable weather risk.");
  if (historicalLane.reloadStrength === "high") reasons.push("Strong historical reload market.");
  if (economics.deadheadMiles > 250) reasons.push("High deadhead miles.");
  if (economics.trueMarginPercent < 10) reasons.push("Weak true margin after estimated costs.");
  if (weatherRisk.riskLevel === "high") reasons.push("Elevated weather risk.");
  if (historicalLane.laneScore < 55) reasons.push("Poor historical lane score.");
  if (!feasible) reasons.push("Tight pickup or delivery window.");
  if (risk.score >= 65) reasons.push("High aggregate risk score.");

  return reasons.slice(0, 5);
}

function createLocalMatch(vehicle: Vehicle, shipment: Shipment): RankedTruckLoadMatch {
  const deadheadMiles = estimateFallbackDistanceMiles(vehicle.location, shipment.origin);
  const loadedMiles = estimateFallbackDistanceMiles(shipment.origin, shipment.destination);
  const economics = calculateTruckingEconomics({
    truck: vehicle,
    shipment,
    deadheadMiles,
    loadedMiles,
  });
  const historicalLane = getHistoricalLaneData(shipment.origin, shipment.destination);
  const weatherRisk = getFallbackWeatherRisk(shipment);
  const risk = calculateRisk({
    vehicle,
    shipment,
    economics,
    weatherRisk,
    historicalLane,
  });
  const fallback = localRecommendation(economics, risk.score);
  const feasible =
    isPickupFeasible(vehicle, shipment, economics.deadheadMiles) &&
    isDeliveryFeasible(shipment, economics.totalMiles);
  const positiveProfitScore = economics.trueNetProfit > 0 ? 1000 : 0;
  const feasibilityScore = feasible ? 120 : -120;
  const rankScore = Number(
    (
      positiveProfitScore +
      economics.rpmTotal * 120 +
      historicalLane.laneScore * 0.8 -
      risk.score * 2 -
      economics.deadheadMiles * 0.25 +
      feasibilityScore
    ).toFixed(2),
  );

  return {
    loadReference: shipment.reference,
    shipmentId: shipment.id,
    truckId: vehicle.id,
    truckLabel: vehicle.label,
    origin: formatLocation(shipment.origin),
    destination: formatLocation(shipment.destination),
    economics,
    risk,
    recommendation: {
      ...fallback,
      source: "local-ranking",
    },
    historicalLane,
    weatherRisk,
    whyRanked: createWhyRanked({
      economics,
      risk,
      historicalLane,
      weatherRisk,
      feasible,
    }),
    feasible,
    rankScore,
  };
}

export function compareAllTruckLoadMatches() {
  return shipments
    .map((shipment) =>
      vehicles
        .map((vehicle) => createLocalMatch(vehicle, shipment))
        .sort((a, b) => b.rankScore - a.rankScore)[0],
    )
    .filter((match): match is RankedTruckLoadMatch => Boolean(match))
    .sort((a, b) => b.rankScore - a.rankScore);
}

export async function runPaidAgentAnalysis(
  shipmentId: string,
  vehicleId?: string,
) {
  const vehicle = getDemoVehicle(vehicleId);
  const shipment = findShipment(shipmentId);

  if (!shipment) {
    throw new Error("Selected load was not found.");
  }

  if (!vehicle) {
    throw new Error("No demo truck is available for analysis.");
  }

  const pickupRoute = await getRouteMetrics(vehicle.location, shipment.origin);
  const deliveryRoute = await getRouteMetrics(shipment.origin, shipment.destination);
  const economics = calculateTruckingEconomics({
    truck: vehicle,
    shipment,
    deadheadMiles: pickupRoute.distanceMiles,
    loadedMiles: deliveryRoute.distanceMiles,
  });
  const historicalLane = getHistoricalLaneData(shipment.origin, shipment.destination);
  const weatherRisk = await getWeatherRisk(shipment);
  const risk = calculateRisk({
    vehicle,
    shipment,
    economics,
    weatherRisk,
    historicalLane,
  });
  const fallbackRecommendation = localRecommendation(economics, risk.score);
  const aiResult = await analyzeRouteWithGemini({
    deadheadMiles: economics.deadheadMiles,
    loadedMiles: economics.loadedMiles,
    totalMiles: economics.totalMiles,
    revenue: economics.revenue,
    fuelCost: economics.fuelCost,
    driverCost: economics.driverCost,
    grossProfit: economics.grossProfit,
    marginPercent: economics.marginPercent,
    rpmLoaded: economics.rpmLoaded,
    rpmTotal: economics.rpmTotal,
    estimatedDetentionCost: economics.estimatedDetentionCost,
    estimatedTollCost: economics.estimatedTollCost,
    waitingCostEstimate: economics.waitingCostEstimate,
    trueNetProfit: economics.trueNetProfit,
    trueMarginPercent: economics.trueMarginPercent,
    riskScore: risk.score,
    weatherRiskLevel: weatherRisk.riskLevel,
    weatherSummary: weatherRisk.summary,
    historicalLaneScore: historicalLane.laneScore,
    historicalRiskNote: historicalLane.historicalRiskNote,
  });
  const recommendation = parseAiDecision(aiResult, fallbackRecommendation);
  const whyRanked = createWhyRanked({
    economics,
    risk,
    historicalLane,
    weatherRisk,
    feasible:
      isPickupFeasible(vehicle, shipment, economics.deadheadMiles) &&
      isDeliveryFeasible(shipment, economics.totalMiles),
  });

  const agents: AgentResult[] = [
    {
      name: "Fleet GPS Agent",
      status: "complete",
      summary: `Demo fleet source selected ${vehicle.label} near ${vehicle.location.city}, ${vehicle.location.state}.`,
      details: {
        vehicleId: vehicle.id,
        lat: vehicle.location.lat,
        lng: vehicle.location.lng,
        status: vehicle.status,
        availableAt: vehicle.availableAt,
      },
    },
    {
      name: "Route Agent",
      status: "complete",
      summary: `${economics.totalMiles} total miles: ${economics.deadheadMiles} deadhead + ${economics.loadedMiles} loaded.`,
      details: {
        deadheadMiles: economics.deadheadMiles,
        loadedMiles: economics.loadedMiles,
        pickupEta: pickupRoute.eta,
        deliveryEta: deliveryRoute.eta,
        source: `${pickupRoute.source}/${deliveryRoute.source}`,
      },
    },
    {
      name: "Economics Agent",
      status: economics.trueNetProfit > 0 ? "complete" : "warning",
      summary: `${economics.trueNetProfit} ${shipment.currency} estimated true net profit at ${economics.rpmTotal} RPM total.`,
      details: {
        revenue: economics.revenue,
        fuelCost: economics.fuelCost,
        driverCost: economics.driverCost,
        operatingCost: economics.operatingCost,
        estimatedDetentionCost: economics.estimatedDetentionCost,
        estimatedTollCost: economics.estimatedTollCost,
        waitingCostEstimate: economics.waitingCostEstimate,
        trueNetProfit: economics.trueNetProfit,
        trueMarginPercent: economics.trueMarginPercent,
        fuelGallons: economics.fuelGallons,
        fuelPricePerGallon: economics.fuelPricePerGallon,
        rpmLoaded: economics.rpmLoaded,
        rpmTotal: economics.rpmTotal,
      },
    },
    {
      name: "Risk Agent",
      status: risk.level === "high" ? "warning" : "complete",
      summary: `${risk.level.toUpperCase()} risk score: ${risk.score}/100 with ${weatherRisk.source === "openweather" ? "live" : "fallback"} weather risk.`,
      details: {
        riskScore: risk.score,
        riskLevel: risk.level,
        weatherRiskLevel: weatherRisk.riskLevel,
        weatherSource: weatherRisk.source,
        historicalLaneScore: historicalLane.laneScore,
        reloadStrength: historicalLane.reloadStrength,
        factors: risk.factors.join(" "),
      },
    },
  ];

  return {
    id: createRunId(vehicle.id, shipment.id),
    vehicle,
    shipment,
    agents,
    economics: {
      ...economics,
      eta: `${pickupRoute.eta} deadhead + ${deliveryRoute.eta} loaded`,
      routeSource: `${pickupRoute.source}/${deliveryRoute.source}`,
    },
    risk,
    weatherRisk,
    historicalLane,
    whyRanked,
    recommendation,
    payment: {
      feeAmount: process.env.AGENT_ANALYSIS_FEE_USDC ?? "0.005",
      feeCurrency: "USDC",
      status: "pending",
    },
  } satisfies AgentRunResult;
}

export function getDefaultShipmentId() {
  return shipments[0]?.id ?? "";
}
