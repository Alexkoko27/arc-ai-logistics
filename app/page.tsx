"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MapView from "@/components/MapView";
import ShipmentOptimizationPanel from "@/components/ShipmentOptimizationPanel";
import { changelogEntries, latestChangelogEntry } from "@/lib/changelog";

type LocationState = "Texas" | "Illinois" | "Georgia";

type Coordinates = {
  lat: number;
  lng: number;
  city: string;
  state: LocationState;
  country: "USA";
};

type Vehicle = {
  id: string;
  label: string;
  driver: string;
  equipment: "Dry Van";
  status: string;
  location: Coordinates;
  availableAt: string;
  mpg: number;
  driverRatePerMile: number;
  preferredLanes: string[];
};

type Shipment = {
  id: string;
  reference: string;
  status: string;
  origin: Coordinates;
  destination: Coordinates;
  commodity: string;
  weightLbs: number;
  revenue: number;
  currency: "USDC";
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  equipment: "Dry Van";
};

type AgentResult = {
  name: string;
  status: "complete" | "warning";
  summary: string;
  details: Record<string, string | number | boolean>;
};

type WeatherRiskResult = {
  source: "openweather" | "fallback";
  riskLevel: "low" | "medium" | "high";
  weatherWeight: number;
  riskScoreDelta: number;
  summary: string;
  reasons: string[];
  checkedAt: string;
};

type HistoricalLaneData = {
  averageRPM: number;
  averageMarginPercent: number;
  delayRatePercent: number;
  reloadStrength: "high" | "medium" | "low";
  typicalDetentionHours: number;
  historicalRiskNote: string;
  laneScore: number;
};

type Economics = {
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
  waitingRiskLevel: "low" | "medium" | "high";
  waitingCostEstimate: number;
  trueNetProfit: number;
  trueMarginPercent: number;
  currency: "USDC";
};

type RiskResult = {
  level: "low" | "medium" | "high";
  score: number;
  factors: string[];
  weather: WeatherRiskResult;
  historicalLane: HistoricalLaneData;
};

type AgentRun = {
  id: string;
  vehicle: Vehicle;
  shipment: Shipment;
  agents: AgentResult[];
  economics: Economics & {
    eta: string;
    routeSource: string;
  };
  risk: RiskResult;
  weatherRisk: WeatherRiskResult;
  historicalLane: HistoricalLaneData;
  whyRanked: string[];
  recommendation: {
    decision: "BOOK" | "WAIT" | "SKIP";
    confidence: number;
    reason: string;
    source: string;
  };
  payment: {
    feeAmount: string;
    feeCurrency: "USDC";
    status: string;
  };
};

type RankedTruckLoadMatch = {
  loadReference: string;
  shipmentId: string;
  truckId: string;
  truckLabel: string;
  origin: string;
  destination: string;
  economics: Economics;
  risk: RiskResult;
  recommendation: {
    decision: "BOOK" | "WAIT" | "SKIP";
    confidence: number;
    reason: string;
    source: string;
  };
  historicalLane: HistoricalLaneData;
  weatherRisk: WeatherRiskResult;
  whyRanked: string[];
  feasible: boolean;
  rankScore: number;
};

type ShipmentScoreBreakdown = {
  distance: number;
  profit: number;
  eta: number;
  risk: number;
};

type RankedShipment = {
  rank: number;
  shipment: Shipment;
  match: RankedTruckLoadMatch;
  score: number;
  scoreBreakdown: ShipmentScoreBreakdown;
};

type DemoDataResponse = {
  vehicles: Vehicle[];
  shipments: Shipment[];
  comparisons: RankedTruckLoadMatch[];
  rankedShipments: RankedShipment[];
  agentFee: {
    amount: string;
    currency: "USDC";
    network: string;
  };
};

type PaymentStatus = "INITIATED" | "PENDING" | "CLEARED" | "FAILED";

type PaymentResponse = {
  transactionId: string | null;
  status: PaymentStatus;
  amount: string;
  currency: "USDC";
  timestamp: string;
  txHash: string | null;
  explorerUrl: string | null;
  terminal: boolean;
  errorReason?: string;
};

type AgentRunResponse = {
  success: boolean;
  message?: string;
  run?: AgentRun;
  payment?: PaymentResponse;
  paymentError?: string;
};

type PaymentStatusResponse = {
  success: boolean;
  status?: PaymentResponse;
  message?: string;
};

const agentPaymentLedger = [
  { agent: "GPS Agent", amount: "0.001 USDC" },
  { agent: "Route Agent", amount: "0.0015 USDC" },
  { agent: "Economics Agent", amount: "0.0015 USDC" },
  { agent: "Risk Agent", amount: "0.001 USDC" },
];

const totalAgentPayment = "0.005 USDC";
const demoLabel = "TESTNET LIVE DEMO -";
const demoVersion = `${latestChangelogEntry.version} - ${latestChangelogEntry.date}`;
const stageOneProgress = [
  "Real routing",
  "Live weather risk",
  "Trucking economics",
  "Multi-load comparison",
  "Historical lane intelligence",
  "Risk-aware recommendations",
];

function formatLocation(location: Coordinates) {
  return `${location.city}, ${location.state}`;
}

function formatLane(origin: Coordinates, destination: Coordinates) {
  return `${formatLocation(origin)} -> ${formatLocation(destination)}`;
}

function formatMatchLane(match: RankedTruckLoadMatch) {
  return `${match.origin} -> ${match.destination}`;
}

function formatWindow(startIso: string, endIso: string) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  };
  const start = new Intl.DateTimeFormat("en-US", options).format(new Date(startIso));
  const end = new Intl.DateTimeFormat("en-US", options).format(new Date(endIso));

  return `${start} - ${end} UTC`;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return "Unavailable";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return timestamp;

  return date.toISOString();
}

function formatDetails(details: AgentResult["details"]) {
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");
}

function formatWeatherSource(source: WeatherRiskResult["source"]) {
  return source === "openweather" ? "live" : "fallback";
}

function isProcessingPayment(status: PaymentStatus | null) {
  return status === "INITIATED" || status === "PENDING";
}

export default function Home() {
  const [demoData, setDemoData] = useState<DemoDataResponse | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentResponse | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/demo-data")
      .then((r) => r.json())
      .then((data: DemoDataResponse) => {
        setDemoData(data);
        setSelectedShipmentId(data.shipments[0]?.id ?? "");
        setSelectedVehicleId(data.vehicles[0]?.id ?? "");
      })
      .catch(() => setError("Unable to load US trucking demo data."));
  }, []);

  const selectedShipment = useMemo(
    () =>
      demoData?.shipments.find(
        (shipment) => shipment.id === selectedShipmentId,
      ) ?? null,
    [demoData, selectedShipmentId],
  );

  const selectedVehicle = useMemo(
    () =>
      demoData?.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [demoData, selectedVehicleId],
  );

  const activePayment = paymentStatus ?? payment;
  const activePaymentStatus = activePayment?.status ?? null;
  const paymentInProgress = isProcessingPayment(activePaymentStatus);
  const proofHash = activePayment?.txHash ?? null;
  const proofLink = activePayment?.explorerUrl ?? null;
  const ledgerStatus =
    activePaymentStatus === "CLEARED"
      ? "Paid / Confirmed"
      : activePaymentStatus === "FAILED"
        ? "Payment failed"
        : paymentInProgress
          ? "Payment processing"
          : "Payment pending";

  useEffect(() => {
    if (!payment?.transactionId || paymentStatus?.terminal) return;

    const timer = window.setInterval(() => {
      fetch(`/api/pay/status?id=${payment.transactionId}`)
        .then((r) => r.json())
        .then((data: PaymentStatusResponse) => {
          if (data.status) {
            setPaymentStatus(data.status);
            setPaymentError(data.status.errorReason ?? data.message ?? null);
          } else if (data.message) {
            setPaymentError(data.message);
          }
        })
        .catch(() => setPaymentError("Unable to refresh Circle payment status."));
    }, 4000);

    return () => window.clearInterval(timer);
  }, [payment?.transactionId, paymentStatus?.terminal]);

  function resetRunState() {
    setRun(null);
    setPayment(null);
    setPaymentStatus(null);
    setPaymentError(null);
    setError(null);
  }

  function selectShipment(shipmentId: string) {
    setSelectedShipmentId(shipmentId);
    resetRunState();
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    resetRunState();
  }

  async function runAgents() {
    if (!selectedShipmentId || !selectedVehicleId || isRunning || paymentInProgress) return;

    setIsRunning(true);
    setError(null);
    setPaymentError(null);
    setRun(null);
    setPayment(null);
    setPaymentStatus(null);

    try {
      const response = await fetch("/api/agent-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipmentId: selectedShipmentId,
          vehicleId: selectedVehicleId,
        }),
      });
      const data = (await response.json()) as AgentRunResponse;

      if (!response.ok || !data.success || !data.run) {
        throw new Error(data.message ?? "Paid agent run failed.");
      }

      setRun(data.run);

      if (data.payment) {
        setPayment(data.payment);
        setPaymentStatus(data.payment);
        setPaymentError(data.payment.errorReason ?? data.paymentError ?? null);
      } else {
        setPaymentError(data.paymentError ?? "Circle payment was not created.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-gray-500">
              US trucking paid AI logistics demo
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wide sm:text-base">
              <p>
                <span>{demoLabel}</span>{" "}
                <span className="text-red-600">{demoVersion}</span>
              </p>
              <button
                type="button"
                onClick={() => setIsChangelogOpen(true)}
                className="rounded border border-gray-300 px-2 py-1 text-xs uppercase tracking-wide text-gray-700 hover:bg-gray-50"
              >
                Changes
              </button>
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">Dispatcher Agent Control Center</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="text-sm font-semibold underline underline-offset-4"
              href="/dashboard"
            >
              Agent dashboard
            </Link>
            <Link
              className="text-sm font-semibold underline underline-offset-4"
              href="/grant"
            >
              Circle grant pitch
            </Link>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
          Select one US dry van truck and one load. The Fleet GPS, Route,
          Economics, and Risk agents run as a paid trucking analysis bundle. The
          demo charges {demoData?.agentFee.amount ?? "0.005"} USDC on Arc Testnet
          and returns an on-chain proof.
        </p>
      </header>

      {isChangelogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3">
              <div>
                <h2 className="font-bold">Changes</h2>
                <p className="text-sm text-gray-600">Version history for the live demo.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangelogOpen(false)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                aria-label="Close changes"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {changelogEntries.map((entry) => (
                <div className="rounded-lg border border-gray-200 p-3" key={entry.version}>
                  <p className="font-semibold">{entry.version} - {entry.date}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold">Stage 1 Progress</h2>
            <p className="mt-1 text-sm font-semibold text-gray-700">
              Stage 1 MVP scope: completed
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {stageOneProgress.map((item) => (
              <div className="rounded-lg border border-gray-200 px-3 py-2" key={item}>
                <span className="font-semibold">✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-xl border p-4">
          <h2 className="font-bold">Demo Trucks</h2>
          <div className="space-y-3">
            {demoData?.vehicles.map((vehicle) => (
              <label
                className="block cursor-pointer rounded-lg border p-3 has-[:checked]:border-green-500 has-[:checked]:bg-green-50"
                key={vehicle.id}
              >
                <input
                  className="mr-2"
                  type="radio"
                  name="vehicle"
                  value={vehicle.id}
                  checked={selectedVehicleId === vehicle.id}
                  onChange={() => selectVehicle(vehicle.id)}
                />
                <span className="font-semibold">{vehicle.label}</span>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>Driver: {vehicle.driver}</p>
                  <p>Location: {formatLocation(vehicle.location)}</p>
                  <p>Status: {vehicle.status}</p>
                  <p>MPG: {vehicle.mpg} | Driver: ${vehicle.driverRatePerMile}/mile</p>
                  <p>Lanes: {vehicle.preferredLanes.join(", ")}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border p-4 xl:col-span-2">
          <h2 className="font-bold">Load Board</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {demoData?.shipments.map((shipment) => (
              <label
                className="block cursor-pointer rounded-lg border p-3 has-[:checked]:border-green-500 has-[:checked]:bg-green-50"
                key={shipment.id}
              >
                <input
                  className="mr-2"
                  type="radio"
                  name="shipment"
                  value={shipment.id}
                  checked={selectedShipmentId === shipment.id}
                  onChange={() => selectShipment(shipment.id)}
                />
                <span className="font-semibold">{shipment.reference}</span>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>Lane: {formatLane(shipment.origin, shipment.destination)}</p>
                  <p>Commodity: {shipment.commodity}</p>
                  <p>Weight: {shipment.weightLbs.toLocaleString()} lbs</p>
                  <p>Revenue: {shipment.revenue} {shipment.currency}</p>
                  <p>Pickup: {formatWindow(shipment.pickupWindowStart, shipment.pickupWindowEnd)}</p>
                  <p>Delivery: {formatWindow(shipment.deliveryWindowStart, shipment.deliveryWindowEnd)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-4">
          <h2 className="font-bold">Selected Load Map</h2>
          {selectedShipment ? (
            <>
              <MapView
                origin={selectedShipment.origin}
                destination={selectedShipment.destination}
                height={360}
              />
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-semibold">Pickup</p>
                  <p>{formatLocation(selectedShipment.origin)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-semibold">Delivery</p>
                  <p>{formatLocation(selectedShipment.destination)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading map...</p>
          )}
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold">Paid Agent Run</h2>
              <p className="text-sm text-gray-600">
                Fee: {demoData?.agentFee.amount ?? "0.005"} USDC on Arc Testnet.
              </p>
            </div>
            <button
              onClick={runAgents}
              disabled={isRunning || paymentInProgress || !selectedShipment || !selectedVehicle}
              className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isRunning
                ? "Running analysis and payment..."
                : paymentInProgress
                  ? "Payment processing..."
                  : "Pay 0.005 USDC and analyze load"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {selectedVehicle && (
              <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                <p className="font-semibold">Selected truck</p>
                <p>{selectedVehicle.label}</p>
                <p>{formatLocation(selectedVehicle.location)}</p>
                <p>Available: {formatWindow(selectedVehicle.availableAt, selectedVehicle.availableAt)}</p>
              </div>
            )}
            {selectedShipment && (
              <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                <p className="font-semibold">Selected load</p>
                <p>{selectedShipment.reference}</p>
                <p>{formatLane(selectedShipment.origin, selectedShipment.destination)}</p>
                <p>Revenue: {selectedShipment.revenue} {selectedShipment.currency}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
              <div>
                <h3 className="font-bold">Agent Payment Ledger</h3>
                <p className="text-gray-600">Per-agent USDC work units</p>
              </div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {ledgerStatus}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {agentPaymentLedger.map((row) => (
                <div className="flex justify-between py-2" key={row.agent}>
                  <span>{row.agent}</span>
                  <span className="font-mono">{row.amount}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
              <span>Total</span>
              <span className="font-mono">{totalAgentPayment}</span>
            </div>
          </div>

          {activePayment && (
            <div className="rounded-lg border border-gray-200 p-3 text-sm">
              <h3 className="font-bold">Payment Status</h3>
              <div className="mt-2 space-y-1 text-gray-600">
                <p>Amount: {activePayment.amount} {activePayment.currency}</p>
                <p>Transaction ID: {activePayment.transactionId ?? "Unavailable"}</p>
                <p>Status: <span className="font-semibold">{activePayment.status}</span></p>
                <p>Timestamp: {formatTimestamp(activePayment.timestamp)}</p>
                {proofHash && <p>Tx hash: {proofHash}</p>}
                {paymentError && <p className="text-red-700">Reason: {paymentError}</p>}
                {proofLink && (
                  <a
                    className="font-semibold text-gray-800 underline underline-offset-4"
                    href={proofLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Arc Testnet explorer proof
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {run && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {run.agents.map((agent) => (
            <div className="space-y-2 rounded-xl border p-4" key={agent.name}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{agent.name}</h3>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs uppercase">
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-gray-700">{agent.summary}</p>
              <pre className="overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">
                {formatDetails(agent.details)}
              </pre>
            </div>
          ))}
        </section>
      )}

      {run && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border p-4">
            <h2 className="font-bold">Recommendation</h2>
            <p className="text-2xl font-bold">{run.recommendation.decision}</p>
            <p>Confidence: {run.recommendation.confidence}%</p>
            <p>Source: {run.recommendation.source}</p>
            <p className="text-sm text-gray-700">{run.recommendation.reason}</p>
            <div className="text-sm text-gray-600">
              <p>Deadhead: {run.economics.deadheadMiles} miles</p>
              <p>Loaded: {run.economics.loadedMiles} miles</p>
              <p>Total: {run.economics.totalMiles} miles</p>
              <p>ETA: {run.economics.eta}</p>
              <p>Route source: {run.economics.routeSource}</p>
              <p>Fuel: {run.economics.fuelCost} {run.economics.currency}</p>
              <p>Driver: {run.economics.driverCost} {run.economics.currency}</p>
              <p>Gross profit: {run.economics.grossProfit} {run.economics.currency}</p>
              <p>Estimated detention: {run.economics.estimatedDetentionCost} {run.economics.currency}</p>
              <p>Estimated tolls: {run.economics.estimatedTollCost} {run.economics.currency}</p>
              <p>Estimated waiting: {run.economics.waitingCostEstimate} {run.economics.currency}</p>
              <p>True net profit: {run.economics.trueNetProfit} {run.economics.currency}</p>
              <p>True margin: {run.economics.trueMarginPercent}%</p>
              <p>RPM loaded: {run.economics.rpmLoaded}</p>
              <p>RPM total: {run.economics.rpmTotal}</p>
              <p>Weather: {run.weatherRisk.riskLevel} ({formatWeatherSource(run.weatherRisk.source)})</p>
              <p>Historical lane score: {run.historicalLane.laneScore}/100</p>
              <p>Risk: {run.risk.level} ({run.risk.score}/100)</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border p-4">
            <div className="space-y-2">
              <h2 className="font-bold">Why Ranked</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                {run.whyRanked.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <h3 className="font-semibold text-gray-800">Weather Risk</h3>
              <p>{run.weatherRisk.summary}</p>
              <p>Source: {formatWeatherSource(run.weatherRisk.source)}</p>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <h3 className="font-semibold text-gray-800">Historical Lane Intelligence</h3>
              <p>{run.historicalLane.historicalRiskNote}</p>
              <p>Reload market: {run.historicalLane.reloadStrength}</p>
            </div>
          </div>
        </section>
      )}

      <ShipmentOptimizationPanel rankedShipments={demoData?.rankedShipments ?? []} />

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h2 className="font-bold">Compare all loads</h2>
          <p className="text-sm text-gray-600">
            Ranked truck-load matches across 10 preset US dry van loads and 3 demo trucks.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-left text-xs">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3">Load</th>
                <th className="py-2 pr-3">Best truck</th>
                <th className="py-2 pr-3">Lane</th>
                <th className="py-2 pr-3">Deadhead</th>
                <th className="py-2 pr-3">Loaded</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">Fuel</th>
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3">True net</th>
                <th className="py-2 pr-3">RPM L/T</th>
                <th className="py-2 pr-3">Weather</th>
                <th className="py-2 pr-3">History</th>
                <th className="py-2 pr-3">Risk</th>
                <th className="py-2 pr-3">Rec</th>
                <th className="py-2 pr-3">Why ranked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {demoData?.comparisons.slice(0, 10).map((match) => (
                <tr key={`${match.shipmentId}-${match.truckId}`}>
                  <td className="py-2 pr-3 font-semibold">{match.loadReference}</td>
                  <td className="py-2 pr-3">{match.truckLabel}</td>
                  <td className="py-2 pr-3">{formatMatchLane(match)}</td>
                  <td className="py-2 pr-3">{match.economics.deadheadMiles}</td>
                  <td className="py-2 pr-3">{match.economics.loadedMiles}</td>
                  <td className="py-2 pr-3">{match.economics.totalMiles}</td>
                  <td className="py-2 pr-3">{match.economics.revenue}</td>
                  <td className="py-2 pr-3">{match.economics.fuelCost}</td>
                  <td className="py-2 pr-3">{match.economics.driverCost}</td>
                  <td className="py-2 pr-3 font-semibold">{match.economics.trueNetProfit}</td>
                  <td className="py-2 pr-3">{match.economics.rpmLoaded}/{match.economics.rpmTotal}</td>
                  <td className="py-2 pr-3">{match.weatherRisk.riskLevel} ({formatWeatherSource(match.weatherRisk.source)})</td>
                  <td className="py-2 pr-3">{match.historicalLane.laneScore}/100</td>
                  <td className="py-2 pr-3">{match.risk.score}</td>
                  <td className="py-2 pr-3 font-semibold">{match.recommendation.decision}</td>
                  <td className="py-2 pr-3">{match.whyRanked.slice(0, 2).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4 sm:p-5">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="font-bold">Demo Video</h2>
            <p className="text-sm text-gray-700">
              Short walkthrough of Arc AI Logistics - a multi-agent freight coordination demo powered by Circle and Arc.
            </p>
            <p className="text-sm text-gray-600">
              The video demonstrates how AI agents evaluate shipment opportunities using GPS data, route intelligence, economics, and risk analysis, then coordinate a USDC-denominated paid agent run with on-chain proof simulation.
            </p>
          </div>
          <video
            className="aspect-video w-full rounded-lg border border-gray-200 bg-black"
            src="/demo/arc-ai-logistics-demo.mp4"
            controls
          />
        </div>
      </section>
    </main>
  );
}
