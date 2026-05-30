type ShipmentScoreBreakdown = {
  distance: number;
  profit: number;
  eta: number;
  risk: number;
};

type RankedShipment = {
  rank: number;
  score: number;
  scoreBreakdown: ShipmentScoreBreakdown;
  shipment: {
    reference: string;
    revenue: number;
    currency: "USDC";
  };
  match: {
    truckLabel: string;
    origin: string;
    destination: string;
    recommendation: {
      decision: "BOOK" | "WAIT" | "SKIP";
      confidence: number;
      reason: string;
    };
    economics: {
      trueNetProfit: number;
      rpmTotal: number;
      totalMiles: number;
    };
    risk: {
      score: number;
      level: "low" | "medium" | "high";
    };
    whyRanked: string[];
  };
};

function formatLane(match: RankedShipment["match"]) {
  return `${match.origin} -> ${match.destination}`;
}

function formatUsdc(value: number) {
  return `${value.toFixed(2)} USDC`;
}

function formatScore(value: number) {
  return value.toFixed(1);
}

export default function ShipmentOptimizationPanel({
  rankedShipments,
}: {
  rankedShipments: RankedShipment[];
}) {
  const topRecommendation = rankedShipments[0] ?? null;
  const topThree = rankedShipments.slice(0, 3);

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-bold">Autonomous Multi-Shipment Optimization</h2>
          <p className="text-sm text-gray-600">
            Scores all demo loads by profit, total miles, ETA, and risk, then ranks
            the best truck-load opportunities.
          </p>
        </div>
        {topRecommendation && (
          <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <p className="text-gray-500">Top recommendation</p>
            <p className="font-bold">
              {topRecommendation.shipment.reference} - {topRecommendation.match.recommendation.decision}
            </p>
          </div>
        )}
      </div>

      {topRecommendation && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <p className="text-gray-500">Score</p>
              <p className="text-xl font-bold">{formatScore(topRecommendation.score)}</p>
            </div>
            <div>
              <p className="text-gray-500">Best truck</p>
              <p className="font-semibold">{topRecommendation.match.truckLabel}</p>
            </div>
            <div>
              <p className="text-gray-500">True net</p>
              <p className="font-semibold">
                {formatUsdc(topRecommendation.match.economics.trueNetProfit)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Risk</p>
              <p className="font-semibold">
                {topRecommendation.match.risk.score}/100 {topRecommendation.match.risk.level}
              </p>
            </div>
          </div>
          <p className="mt-3 text-gray-700">{formatLane(topRecommendation.match)}</p>
          <p className="mt-1 text-gray-600">
            {topRecommendation.match.recommendation.reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {topThree.map((item) => (
          <div className="space-y-3 rounded-lg border border-gray-200 p-3" key={item.shipment.reference}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Rank #{item.rank}
                </p>
                <h3 className="font-bold">{item.shipment.reference}</h3>
              </div>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">
                {formatScore(item.score)}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{formatLane(item.match)}</p>
              <p>Truck: {item.match.truckLabel}</p>
              <p>Recommendation: {item.match.recommendation.decision}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-500">Distance</p>
                <p className="font-semibold">{item.scoreBreakdown.distance} mi</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-500">Profit</p>
                <p className="font-semibold">{formatUsdc(item.scoreBreakdown.profit)}</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-500">ETA</p>
                <p className="font-semibold">{item.scoreBreakdown.eta} h</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-500">Risk</p>
                <p className="font-semibold">{item.scoreBreakdown.risk}/100</p>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
              {item.match.whyRanked.slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
