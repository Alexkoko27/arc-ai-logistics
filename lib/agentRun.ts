import { analyzeRouteWithGemini } from "@/lib/gemini";
import { getRouteMetrics } from "@/lib/googleRoutes";
import { findShipment, findVehicle, Shipment, Vehicle } from "@/lib/demoData";

type AgentStatus = "complete" | "warning";

type AgentResult = {
  name: string;
  status: AgentStatus;
  summary: string;
  details: Record<string, string | number | boolean>;
};

export type AgentRunResult = {
  id: string;
  vehicle: Vehicle;
  shipment: Shipment;
  agents: AgentResult[];
  economics: {
    distanceKm: number;
    eta: string;
    revenue: number;
    operatingCost: number;
    grossProfit: number;
    marginPercent: number;
    currency: Shipment["currency"];
    routeSource: string;
  };
  risk: {
    level: "low" | "medium" | "high";
    score: number;
    factors: string[];
  };
  recommendation: {
    decision: "BOOK" | "WAIT" | "SKIP";
    confidence: number;
    reason: string;
    source: string;
  };
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

function calculateRisk(vehicle: Vehicle, shipment: Shipment, distanceKm: number) {
  const factors: string[] = [];
  let score = 18;

  if (vehicle.status !== "available") {
    score += 30;
    factors.push(`Vehicle status is ${vehicle.status}.`);
  }

  if (vehicle.hoursUntilAvailable > 0) {
    score += Math.min(25, vehicle.hoursUntilAvailable * 6);
    factors.push(
      `Driver can start in ${vehicle.hoursUntilAvailable} hours, not immediately.`,
    );
  }

  if (distanceKm > 700) {
    score += 18;
    factors.push("Long route may require rest-time planning.");
  }

  if (shipment.weightKg > 12000) {
    score += 10;
    factors.push("Heavy shipment increases operating risk and fuel sensitivity.");
  }

  if (shipment.origin.country !== vehicle.location.country) {
    score += 8;
    factors.push("Cross-border pickup may add waiting or documentation risk.");
  }

  if (factors.length === 0) {
    factors.push("No major demo risk factors detected.");
  }

  const normalizedScore = Math.min(100, Math.round(score));

  return {
    level:
      normalizedScore >= 65 ? "high" : normalizedScore >= 38 ? "medium" : "low",
    score: normalizedScore,
    factors,
  } as const;
}

function localRecommendation(grossProfit: number, marginPercent: number, riskScore: number) {
  if (grossProfit > 250 && marginPercent >= 20 && riskScore < 55) {
    return {
      decision: "BOOK" as const,
      confidence: 82,
      reason:
        "Profit and margin are healthy, and the risk level is acceptable for dispatch.",
    };
  }

  if (grossProfit > 100 && riskScore < 70) {
    return {
      decision: "WAIT" as const,
      confidence: 64,
      reason:
        "The shipment is possible, but dispatcher should review timing, return lane, or rate improvement.",
    };
  }

  return {
    decision: "SKIP" as const,
    confidence: 71,
    reason:
      "Expected profit or risk profile is not strong enough for this demo match.",
  };
}

function parseAiDecision(
  ai: Awaited<ReturnType<typeof analyzeRouteWithGemini>>,
  fallback: ReturnType<typeof localRecommendation>,
) {
  if (typeof ai === "string") {
    return {
      ...fallback,
      source: "local-fallback",
    };
  }

  const recommendation = ai.recommendation?.toUpperCase();
  const decision =
    recommendation === "BOOK" || recommendation === "SKIP"
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

export async function runPaidAgentAnalysis(vehicleId: string, shipmentId: string) {
  const vehicle = findVehicle(vehicleId);
  const shipment = findShipment(shipmentId);

  if (!vehicle || !shipment) {
    throw new Error("Selected vehicle or shipment was not found.");
  }

  const pickupRoute = await getRouteMetrics(vehicle.location, shipment.origin);
  const deliveryRoute = await getRouteMetrics(shipment.origin, shipment.destination);
  const distanceKm = Number(
    (pickupRoute.distanceKm + deliveryRoute.distanceKm).toFixed(1),
  );
  const operatingCost = Number((distanceKm * vehicle.costPerKm).toFixed(2));
  const grossProfit = Number((shipment.revenue - operatingCost).toFixed(2));
  const marginPercent = Number(
    ((grossProfit / shipment.revenue) * 100).toFixed(1),
  );
  const risk = calculateRisk(vehicle, shipment, distanceKm);
  const fallbackRecommendation = localRecommendation(
    grossProfit,
    marginPercent,
    risk.score,
  );
  const aiResult = await analyzeRouteWithGemini(
    distanceKm,
    `${pickupRoute.eta} to pickup + ${deliveryRoute.eta} delivery`,
    grossProfit,
  );
  const recommendation = parseAiDecision(aiResult, fallbackRecommendation);

  const agents: AgentResult[] = [
    {
      name: "GPS Agent",
      status: "complete",
      summary: `Truck located near ${vehicle.location.city}, ${vehicle.location.country}.`,
      details: {
        vehicleId: vehicle.id,
        lat: vehicle.location.lat,
        lng: vehicle.location.lng,
        status: vehicle.status,
      },
    },
    {
      name: "Route Agent",
      status: "complete",
      summary: `${distanceKm} km total route, including pickup and delivery legs.`,
      details: {
        pickupEta: pickupRoute.eta,
        deliveryEta: deliveryRoute.eta,
        source: `${pickupRoute.source}/${deliveryRoute.source}`,
      },
    },
    {
      name: "Economics Agent",
      status: grossProfit > 0 ? "complete" : "warning",
      summary: `${grossProfit} ${shipment.currency} estimated gross profit before platform fees.`,
      details: {
        revenue: shipment.revenue,
        operatingCost,
        marginPercent,
        costPerKm: vehicle.costPerKm,
      },
    },
    {
      name: "Risk Agent",
      status: risk.level === "high" ? "warning" : "complete",
      summary: `${risk.level.toUpperCase()} risk score: ${risk.score}/100.`,
      details: {
        riskScore: risk.score,
        riskLevel: risk.level,
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
      distanceKm,
      eta: `${pickupRoute.eta} + ${deliveryRoute.eta}`,
      revenue: shipment.revenue,
      operatingCost,
      grossProfit,
      marginPercent,
      currency: shipment.currency,
      routeSource: `${pickupRoute.source}/${deliveryRoute.source}`,
    },
    risk,
    recommendation,
    payment: {
      feeAmount: process.env.AGENT_ANALYSIS_FEE_USDC ?? "0.005",
      feeCurrency: "USDC",
      status: "pending",
    },
  } satisfies AgentRunResult;
}
