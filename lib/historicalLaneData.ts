import { Coordinates } from "@/lib/demoData";

export type HistoricalLaneData = {
  averageRPM: number;
  averageMarginPercent: number;
  delayRatePercent: number;
  reloadStrength: "high" | "medium" | "low";
  typicalDetentionHours: number;
  historicalRiskNote: string;
  laneScore: number;
};

type HistoricalLaneMatch = HistoricalLaneData & {
  matchSource: "exact-lane" | "state-to-state" | "global-fallback";
};

const stateAbbreviation: Record<Coordinates["state"], string> = {
  Texas: "TX",
  Illinois: "IL",
  Georgia: "GA",
};

const globalFallback: HistoricalLaneData = {
  averageRPM: 1.72,
  averageMarginPercent: 17,
  delayRatePercent: 18,
  reloadStrength: "medium",
  typicalDetentionHours: 1.4,
  historicalRiskNote: "Global demo fallback: average dry van lane performance with moderate reload confidence.",
  laneScore: 68,
};

const exactLaneData: Record<string, HistoricalLaneData> = {
  "Dallas,TX-Chicago,IL": {
    averageRPM: 1.95,
    averageMarginPercent: 21,
    delayRatePercent: 14,
    reloadStrength: "high",
    typicalDetentionHours: 1.2,
    historicalRiskNote: "Historically profitable northbound retail lane with strong Chicago reload options.",
    laneScore: 84,
  },
  "Houston,TX-Atlanta,GA": {
    averageRPM: 1.82,
    averageMarginPercent: 18,
    delayRatePercent: 16,
    reloadStrength: "high",
    typicalDetentionHours: 1.1,
    historicalRiskNote: "Good Gulf-to-Southeast lane with stable reload demand around Atlanta.",
    laneScore: 78,
  },
  "Joliet,IL-Atlanta,GA": {
    averageRPM: 1.66,
    averageMarginPercent: 14,
    delayRatePercent: 22,
    reloadStrength: "medium",
    typicalDetentionHours: 1.8,
    historicalRiskNote: "Moderate Midwest-to-Southeast lane; watch appointment timing and reload quality.",
    laneScore: 62,
  },
  "Atlanta,GA-Houston,TX": {
    averageRPM: 1.58,
    averageMarginPercent: 12,
    delayRatePercent: 26,
    reloadStrength: "medium",
    typicalDetentionHours: 2.1,
    historicalRiskNote: "Lane can work, but delay history and margin pressure require rate discipline.",
    laneScore: 56,
  },
  "Savannah,GA-Dallas,TX": {
    averageRPM: 1.88,
    averageMarginPercent: 20,
    delayRatePercent: 17,
    reloadStrength: "high",
    typicalDetentionHours: 1.5,
    historicalRiskNote: "Port-adjacent outbound freight with good Dallas reload probability.",
    laneScore: 80,
  },
};

const stateToStateData: Record<string, HistoricalLaneData> = {
  "TX-IL": {
    averageRPM: 1.87,
    averageMarginPercent: 19,
    delayRatePercent: 16,
    reloadStrength: "high",
    typicalDetentionHours: 1.3,
    historicalRiskNote: "Texas to Illinois lanes usually support healthy total RPM and reload options.",
    laneScore: 76,
  },
  "TX-GA": {
    averageRPM: 1.78,
    averageMarginPercent: 17,
    delayRatePercent: 18,
    reloadStrength: "high",
    typicalDetentionHours: 1.4,
    historicalRiskNote: "Texas to Georgia lanes are usually balanced, with useful Atlanta reload density.",
    laneScore: 73,
  },
  "IL-TX": {
    averageRPM: 1.81,
    averageMarginPercent: 18,
    delayRatePercent: 15,
    reloadStrength: "high",
    typicalDetentionHours: 1.2,
    historicalRiskNote: "Illinois to Texas lanes have good demand and usually recover deadhead well.",
    laneScore: 77,
  },
  "IL-GA": {
    averageRPM: 1.64,
    averageMarginPercent: 14,
    delayRatePercent: 23,
    reloadStrength: "medium",
    typicalDetentionHours: 1.9,
    historicalRiskNote: "Illinois to Georgia lanes are usable but often need stronger rates to offset delay risk.",
    laneScore: 61,
  },
  "GA-TX": {
    averageRPM: 1.69,
    averageMarginPercent: 15,
    delayRatePercent: 24,
    reloadStrength: "medium",
    typicalDetentionHours: 2,
    historicalRiskNote: "Georgia to Texas lanes can be profitable, but detention and reload timing vary.",
    laneScore: 64,
  },
  "GA-IL": {
    averageRPM: 1.6,
    averageMarginPercent: 13,
    delayRatePercent: 27,
    reloadStrength: "low",
    typicalDetentionHours: 2.3,
    historicalRiskNote: "Georgia to Illinois lanes show elevated delay history and weaker reload confidence.",
    laneScore: 52,
  },
};

function exactLaneKey(origin: Coordinates, destination: Coordinates) {
  return `${origin.city},${stateAbbreviation[origin.state]}-${destination.city},${stateAbbreviation[destination.state]}`;
}

function stateLaneKey(origin: Coordinates, destination: Coordinates) {
  return `${stateAbbreviation[origin.state]}-${stateAbbreviation[destination.state]}`;
}

export function getHistoricalLaneData(
  origin: Coordinates,
  destination: Coordinates,
): HistoricalLaneMatch {
  const exact = exactLaneData[exactLaneKey(origin, destination)];

  if (exact) {
    return { ...exact, matchSource: "exact-lane" };
  }

  const stateMatch = stateToStateData[stateLaneKey(origin, destination)];

  if (stateMatch) {
    return { ...stateMatch, matchSource: "state-to-state" };
  }

  return { ...globalFallback, matchSource: "global-fallback" };
}
