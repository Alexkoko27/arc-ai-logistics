export type ShipmentScoreInput = {
  distance: number;
  profit: number;
  eta: number;
  risk: number;
};

export type ShipmentScoreResult = {
  score: number;
};

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function inverseScore(value: number, best: number, worst: number) {
  if (worst <= best) return 0;

  return clamp(((worst - value) / (worst - best)) * 100);
}

function profitScore(profit: number) {
  return clamp(((profit + 250) / 1750) * 100);
}

export function calculateShipmentScore({
  distance,
  profit,
  eta,
  risk,
}: ShipmentScoreInput): ShipmentScoreResult {
  const distanceComponent = inverseScore(safeNumber(distance, 1500), 250, 1500);
  const profitComponent = profitScore(safeNumber(profit, -250));
  const etaComponent = inverseScore(safeNumber(eta, 30), 5, 30);
  const riskComponent = inverseScore(safeNumber(risk, 100), 10, 100);
  const score =
    profitComponent * 0.45 +
    distanceComponent * 0.2 +
    etaComponent * 0.15 +
    riskComponent * 0.2;

  return {
    score: Number(clamp(score).toFixed(1)),
  };
}
