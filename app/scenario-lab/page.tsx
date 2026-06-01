"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ScenarioLoad = {
  load_id: string;
  origin_city: string;
  origin_state: string;
  origin_lat: number;
  origin_lng: number;
  destination_city: string;
  destination_state: string;
  destination_lat: number;
  destination_lng: number;
  equipment_type: string;
  weight_lbs: number;
  miles: number;
  rate_usd: number;
  priority: "High" | "Medium" | "Low" | string;
};

type ScenarioTruck = {
  truck_id: string;
  current_city: string;
  current_state: string;
  current_lat: number;
  current_lng: number;
  equipment_type: string;
  max_weight_lbs: number;
  cost_per_mile: number;
};

type Recommendation = {
  load: ScenarioLoad;
  emptyMiles: number;
  estimatedCost: number;
  estimatedProfit: number;
  score: number;
  whyRecommended: string[];
  riskNotes: string[];
};

type RecommendationGroup = {
  truck: ScenarioTruck;
  recommendations: Recommendation[];
};

const loadsPath = "/sample-data/sample_loads_50.csv";
const trucksPath = "/sample-data/sample_trucks_5.csv";

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);

  return rows.filter(Boolean).map((row) => {
    const values = splitCsvLine(row);

    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapLoad(row: Record<string, string>): ScenarioLoad {
  return {
    load_id: row.load_id,
    origin_city: row.origin_city,
    origin_state: row.origin_state,
    origin_lat: toNumber(row.origin_lat),
    origin_lng: toNumber(row.origin_lng),
    destination_city: row.destination_city,
    destination_state: row.destination_state,
    destination_lat: toNumber(row.destination_lat),
    destination_lng: toNumber(row.destination_lng),
    equipment_type: row.equipment_type,
    weight_lbs: toNumber(row.weight_lbs),
    miles: toNumber(row.miles),
    rate_usd: toNumber(row.rate_usd),
    priority: row.priority,
  };
}

function mapTruck(row: Record<string, string>): ScenarioTruck {
  return {
    truck_id: row.truck_id,
    current_city: row.current_city,
    current_state: row.current_state,
    current_lat: toNumber(row.current_lat),
    current_lng: toNumber(row.current_lng),
    equipment_type: row.equipment_type,
    max_weight_lbs: toNumber(row.max_weight_lbs),
    cost_per_mile: toNumber(row.cost_per_mile),
  };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMiles = 3958.8;
  const latDelta = degreesToRadians(toLat - fromLat);
  const lngDelta = degreesToRadians(toLng - fromLng);
  const startLat = degreesToRadians(fromLat);
  const endLat = degreesToRadians(toLat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function priorityScore(priority: string) {
  if (priority === "High") return 10;
  if (priority === "Medium") return 6;
  return 3;
}

function buildRecommendation(truck: ScenarioTruck, load: ScenarioLoad): Recommendation | null {
  if (truck.equipment_type !== load.equipment_type) return null;
  if (load.weight_lbs > truck.max_weight_lbs) return null;

  const emptyMiles = haversineMiles(
    truck.current_lat,
    truck.current_lng,
    load.origin_lat,
    load.origin_lng,
  );
  const estimatedCost = (load.miles + emptyMiles) * truck.cost_per_mile;
  const estimatedProfit = load.rate_usd - estimatedCost;

  if (estimatedProfit <= 0) return null;

  const margin = estimatedProfit / load.rate_usd;
  const profitScore = clamp(margin * 100, 0, 40);
  const emptyMilesScore = clamp(15 - (emptyMiles / 250) * 15, 0, 15);
  const score = Math.round(
    profitScore + emptyMilesScore + 20 + 15 + priorityScore(load.priority),
  );

  if (score < 60) return null;

  const whyRecommended = [
    `${truck.equipment_type} equipment matches the load requirement.`,
    `Projected profit is ${formatCurrency(estimatedProfit)} after loaded and empty miles.`,
    `${load.priority} priority adds dispatch value to the match.`,
  ];
  const riskNotes = [
    emptyMiles > 200
      ? `Empty miles are high at ${formatMiles(emptyMiles)}, so dispatcher review is recommended.`
      : `Empty miles are controlled at ${formatMiles(emptyMiles)}.`,
    margin < 0.18
      ? `Profit margin is modest at ${formatPercent(margin)}.`
      : `Profit margin is healthy at ${formatPercent(margin)}.`,
    "Broker and shipper contact are simulated in this MVP.",
  ];

  return {
    load,
    emptyMiles,
    estimatedCost,
    estimatedProfit,
    score,
    whyRecommended,
    riskNotes,
  };
}

function runMatching(loads: ScenarioLoad[], trucks: ScenarioTruck[]): RecommendationGroup[] {
  return trucks.map((truck) => ({
    truck,
    recommendations: loads
      .map((load) => buildRecommendation(truck, load))
      .filter((recommendation): recommendation is Recommendation => recommendation !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMiles(value: number) {
  return `${Math.round(value).toLocaleString()} mi`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLane(load: ScenarioLoad) {
  return `${load.origin_city}, ${load.origin_state} -> ${load.destination_city}, ${load.destination_state}`;
}

export default function ScenarioLabPage() {
  const [loads, setLoads] = useState<ScenarioLoad[]>([]);
  const [trucks, setTrucks] = useState<ScenarioTruck[]>([]);
  const [recommendationGroups, setRecommendationGroups] = useState<RecommendationGroup[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "matching" | "matched">("idle");
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const equipmentTypes = Array.from(
      new Set([...loads.map((load) => load.equipment_type), ...trucks.map((truck) => truck.equipment_type)]),
    ).sort();
    const totalRevenue = loads.reduce((sum, load) => sum + load.rate_usd, 0);

    return {
      equipmentTypes,
      totalRevenue,
    };
  }, [loads, trucks]);

  async function loadSampleScenario() {
    setStatus("loading");
    setError(null);
    setRecommendationGroups([]);

    try {
      const [loadsResponse, trucksResponse] = await Promise.all([
        fetch(loadsPath),
        fetch(trucksPath),
      ]);

      if (!loadsResponse.ok || !trucksResponse.ok) {
        throw new Error("Unable to load sample scenario CSV files.");
      }

      const [loadsText, trucksText] = await Promise.all([
        loadsResponse.text(),
        trucksResponse.text(),
      ]);

      setLoads(parseCsv(loadsText).map(mapLoad));
      setTrucks(parseCsv(trucksText).map(mapTruck));
      setStatus("loaded");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sample scenario.");
      setStatus("idle");
    }
  }

  function runAgentMatching() {
    setStatus("matching");
    setError(null);
    setRecommendationGroups(runMatching(loads, trucks));
    setStatus("matched");
  }

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Demo sandbox
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Scenario Lab</h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Upload or load a sample logistics scenario to see how AI-assisted agents can match trucks with available loads. Contact actions are simulated.
          </p>
          <p className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            This is a demo sandbox using sample CSV data. It does not contact real brokers or shippers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="text-sm font-semibold underline underline-offset-4" href="/">
            Back to demo
          </Link>
          <Link className="text-sm font-semibold underline underline-offset-4" href="/dashboard">
            Agent dashboard
          </Link>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold">Sample Scenario</h2>
            <p className="text-sm text-gray-600">
              Loads and trucks are fetched from public sample CSV files bundled with the app.
            </p>
          </div>
          <button
            className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={status === "loading"}
            onClick={loadSampleScenario}
            type="button"
          >
            {status === "loading" ? "Loading sample scenario..." : "Load sample scenario"}
          </button>
        </div>
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {loads.length > 0 && trucks.length > 0 && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total loads</p>
              <p className="mt-2 text-2xl font-bold">{loads.length}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total trucks</p>
              <p className="mt-2 text-2xl font-bold">{trucks.length}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Equipment types detected</p>
              <p className="mt-2 text-lg font-bold">{summary.equipmentTypes.join(", ")}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total available load revenue</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <h2 className="font-bold">Loads preview</h2>
                <p className="text-sm text-gray-600">First 10 rows from sample_loads_50.csv.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Load ID</th>
                      <th className="py-2 pr-3">Lane</th>
                      <th className="py-2 pr-3">Equipment</th>
                      <th className="py-2 pr-3">Weight</th>
                      <th className="py-2 pr-3">Miles</th>
                      <th className="py-2 pr-3">Rate</th>
                      <th className="py-2 pr-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loads.slice(0, 10).map((load) => (
                      <tr key={load.load_id}>
                        <td className="py-2 pr-3 font-semibold">{load.load_id}</td>
                        <td className="py-2 pr-3">{formatLane(load)}</td>
                        <td className="py-2 pr-3">{load.equipment_type}</td>
                        <td className="py-2 pr-3">{load.weight_lbs.toLocaleString()} lbs</td>
                        <td className="py-2 pr-3">{formatMiles(load.miles)}</td>
                        <td className="py-2 pr-3">{formatCurrency(load.rate_usd)}</td>
                        <td className="py-2 pr-3">{load.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <h2 className="font-bold">Trucks preview</h2>
                <p className="text-sm text-gray-600">All 5 rows from sample_trucks_5.csv.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Truck ID</th>
                      <th className="py-2 pr-3">Current location</th>
                      <th className="py-2 pr-3">Equipment</th>
                      <th className="py-2 pr-3">Max weight</th>
                      <th className="py-2 pr-3">Cost per mile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trucks.map((truck) => (
                      <tr key={truck.truck_id}>
                        <td className="py-2 pr-3 font-semibold">{truck.truck_id}</td>
                        <td className="py-2 pr-3">{truck.current_city}, {truck.current_state}</td>
                        <td className="py-2 pr-3">{truck.equipment_type}</td>
                        <td className="py-2 pr-3">{truck.max_weight_lbs.toLocaleString()} lbs</td>
                        <td className="py-2 pr-3">{formatCurrency(truck.cost_per_mile)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold">Agent Matching</h2>
              <p className="text-sm text-gray-600">
                Local matching checks equipment, weight, empty miles, estimated cost, profit, priority, and score.
              </p>
            </div>
            <button
              className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={status === "matching"}
              onClick={runAgentMatching}
              type="button"
            >
              {status === "matching" ? "Running matching..." : "Run Agent Matching"}
            </button>
          </section>
        </>
      )}

      {recommendationGroups.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-bold">Matching Results</h2>
            <p className="text-sm text-gray-600">
              Recommendations are grouped by truck and limited to 0-3 positive-profit matches per truck.
            </p>
          </div>

          {recommendationGroups.map((group) => (
            <div className="space-y-4 rounded-xl border p-4" key={group.truck.truck_id}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500">Truck ID</p>
                  <p className="font-bold">{group.truck.truck_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current city/state</p>
                  <p className="font-bold">{group.truck.current_city}, {group.truck.current_state}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Equipment type</p>
                  <p className="font-bold">{group.truck.equipment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recommendations found</p>
                  <p className="font-bold">{group.recommendations.length}</p>
                </div>
              </div>

              {group.recommendations.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  No positive-profit recommendations scored 60 or higher for this truck.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                  {group.recommendations.map((recommendation) => (
                    <article className="space-y-3 rounded-lg border border-gray-200 p-4" key={`${group.truck.truck_id}-${recommendation.load.load_id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500">Load ID</p>
                          <h3 className="text-lg font-bold">{recommendation.load.load_id}</h3>
                        </div>
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          Score {recommendation.score}
                        </span>
                      </div>

                      <p className="text-sm font-semibold">
                        {recommendation.load.origin_city}, {recommendation.load.origin_state} &rarr; {recommendation.load.destination_city}, {recommendation.load.destination_state}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <p>Rate: <span className="font-semibold">{formatCurrency(recommendation.load.rate_usd)}</span></p>
                        <p>Loaded miles: <span className="font-semibold">{formatMiles(recommendation.load.miles)}</span></p>
                        <p>Empty miles: <span className="font-semibold">{formatMiles(recommendation.emptyMiles)}</span></p>
                        <p>Estimated cost: <span className="font-semibold">{formatCurrency(recommendation.estimatedCost)}</span></p>
                        <p>Estimated profit: <span className="font-semibold">{formatCurrency(recommendation.estimatedProfit)}</span></p>
                        <p>Priority: <span className="font-semibold">{recommendation.load.priority}</span></p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Why recommended</p>
                        <ul className="list-disc space-y-1 pl-5 text-gray-700">
                          {recommendation.whyRecommended.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Risk notes</p>
                        <ul className="list-disc space-y-1 pl-5 text-gray-700">
                          {recommendation.riskNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 border-t border-gray-200 pt-3">
                        <button
                          className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          disabled
                          type="button"
                        >
                          Contact shipper
                        </button>
                        <p className="text-xs leading-5 text-gray-500">
                          Simulated action — real shipper contact is not enabled in this MVP.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
