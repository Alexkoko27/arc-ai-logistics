import type { Shipment } from "@/lib/demoData";
import {
  compareAllTruckLoadMatches,
  type RankedTruckLoadMatch,
} from "@/lib/agentRun";
import { calculateShipmentScore } from "@/lib/scoring/shipmentScore";

const AVERAGE_TRUCK_SPEED_MPH = 58;

export type ShipmentScoreBreakdown = {
  distance: number;
  profit: number;
  eta: number;
  risk: number;
};

export type RankedShipment = {
  rank: number;
  shipment: Shipment;
  match: RankedTruckLoadMatch;
  score: number;
  scoreBreakdown: ShipmentScoreBreakdown;
};

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function calculateEtaHours(totalMiles: number) {
  return safeNumber(totalMiles, 0) / AVERAGE_TRUCK_SPEED_MPH;
}

function buildScoreBreakdown(match: RankedTruckLoadMatch): ShipmentScoreBreakdown {
  const totalMiles = safeNumber(match.economics.totalMiles, 0);

  return {
    distance: totalMiles,
    profit: safeNumber(match.economics.trueNetProfit, 0),
    eta: Number(calculateEtaHours(totalMiles).toFixed(1)),
    risk: safeNumber(match.risk.score, 100),
  };
}

export function rankShipments(inputShipments: Shipment[]): RankedShipment[] {
  const shipmentById = new Map(
    inputShipments.map((shipment) => [shipment.id, shipment]),
  );

  return compareAllTruckLoadMatches()
    .map((match) => {
      const shipment = shipmentById.get(match.shipmentId);

      if (!shipment) return null;

      const scoreBreakdown = buildScoreBreakdown(match);
      const { score } = calculateShipmentScore(scoreBreakdown);

      return {
        rank: 0,
        shipment,
        match,
        score,
        scoreBreakdown,
      } satisfies RankedShipment;
    })
    .filter((shipment): shipment is RankedShipment => Boolean(shipment))
    .sort((a, b) => b.score - a.score)
    .map((shipment, index) => ({
      ...shipment,
      rank: index + 1,
    }));
}
