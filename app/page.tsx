"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";

type Coordinates = {
  lat: number;
  lng: number;
  city: string;
  country: string;
};

type Vehicle = {
  id: string;
  label: string;
  driver: string;
  equipment: string;
  status: string;
  location: Coordinates;
  preferredLane: string;
  hoursUntilAvailable: number;
  costPerKm: number;
};

type Shipment = {
  id: string;
  reference: string;
  status: string;
  origin: Coordinates;
  destination: Coordinates;
  commodity: string;
  weightKg: number;
  revenue: number;
  currency: "USDC" | "EURC";
  pickupWindow: string;
};

type AgentResult = {
  name: string;
  status: "complete" | "warning";
  summary: string;
  details: Record<string, string | number | boolean>;
};

type AgentRun = {
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
    currency: "USDC" | "EURC";
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
    status: string;
  };
};

type DemoDataResponse = {
  shipments: Shipment[];
  agentFee: {
    amount: string;
    currency: "USDC";
    network: string;
  };
};

type PaymentResponse = {
  transactionId: string;
  state: string;
  txHash: string | null;
  amount: string;
  currency: "USDC";
  sourceWalletAddress: string;
  destinationAddress: string;
  network: string;
  blockchain: string;
  tokenAddress: string;
  explorerBaseUrl: string;
};

type AgentRunResponse = {
  success: boolean;
  message?: string;
  run?: AgentRun;
  payment?: PaymentResponse;
};

type PaymentStatusResponse = {
  success: boolean;
  status?: {
    transactionId: string;
    state: string;
    txHash: string | null;
    terminal: boolean;
    explorerUrl: string;
  };
  message?: string;
};

function formatLocation(location: Coordinates) {
  return `${location.city}, ${location.country}`;
}

function formatLane(origin: Coordinates, destination: Coordinates) {
  return `${formatLocation(origin)} -> ${formatLocation(destination)}`;
}

function formatDetails(details: AgentResult["details"]) {
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");
}

export default function Home() {
  const [demoData, setDemoData] = useState<DemoDataResponse | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    PaymentStatusResponse["status"] | null
  >(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo-data")
      .then((r) => r.json())
      .then((data: DemoDataResponse) => {
        setDemoData(data);
        setSelectedShipmentId(data.shipments[0]?.id ?? "");
      })
      .catch(() => setError("Unable to load dispatcher demo data."));
  }, []);

  const selectedShipment = useMemo(
    () =>
      demoData?.shipments.find(
        (shipment) => shipment.id === selectedShipmentId,
      ) ?? null,
    [demoData, selectedShipmentId],
  );

  useEffect(() => {
    if (!payment?.transactionId || paymentStatus?.terminal) return;

    const timer = window.setInterval(() => {
      fetch(`/api/pay/status?id=${payment.transactionId}`)
        .then((r) => r.json())
        .then((data: PaymentStatusResponse) => {
          if (data.status) setPaymentStatus(data.status);
        })
        .catch(() => undefined);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [payment?.transactionId, paymentStatus?.terminal]);

  function selectShipment(shipmentId: string) {
    setSelectedShipmentId(shipmentId);
    setRun(null);
    setPayment(null);
    setPaymentStatus(null);
    setError(null);
  }

  async function runAgents() {
    if (!selectedShipmentId) return;

    setIsRunning(true);
    setError(null);
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
        }),
      });
      const data = (await response.json()) as AgentRunResponse;

      if (!response.ok || !data.success || !data.run || !data.payment) {
        throw new Error(data.message ?? "Paid agent run failed.");
      }

      setRun(data.run);
      setPayment(data.payment);
      setPaymentStatus({
        transactionId: data.payment.transactionId,
        state: data.payment.state,
        txHash: data.payment.txHash,
        terminal: false,
        explorerUrl: data.payment.txHash
          ? `${data.payment.explorerBaseUrl}/tx/${data.payment.txHash}`
          : data.payment.explorerBaseUrl,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="p-8 space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-gray-500">
          Arc Testnet paid AI logistics demo
        </p>
        <h1 className="text-3xl font-bold">Dispatcher Agent Control Center</h1>
        <p className="max-w-3xl text-gray-600">
          Select one shipment request. The Fleet GPS, Route, Economics, and Risk
          agents run as a paid analysis bundle. The demo charges {demoData?.agentFee.amount ?? "0.005"} USDC on Arc Testnet and returns an on-chain proof.
        </p>
      </header>

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border p-4 rounded-xl space-y-3">
          <h2 className="font-bold">Shipment Requests</h2>
          <div className="space-y-3">
            {demoData?.shipments.map((shipment) => (
              <label
                className="block border rounded-lg p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50"
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
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>Lane: {formatLane(shipment.origin, shipment.destination)}</p>
                  <p>Commodity: {shipment.commodity}</p>
                  <p>Revenue: {shipment.revenue} {shipment.currency}</p>
                  <p>Pickup: {shipment.pickupWindow}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="border p-4 rounded-xl space-y-3">
          <h2 className="font-bold">Selected Shipment Map</h2>
          {selectedShipment ? (
            <>
              <MapView
                origin={selectedShipment.origin}
                destination={selectedShipment.destination}
                height={360}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold">Origin</p>
                  <p>{formatLocation(selectedShipment.origin)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold">Destination</p>
                  <p>{formatLocation(selectedShipment.destination)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading map...</p>
          )}
        </div>
      </section>

      <section className="border p-4 rounded-xl space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold">Paid Agent Run</h2>
            <p className="text-sm text-gray-600">
              Fee: {demoData?.agentFee.amount ?? "0.005"} USDC on Arc Testnet.
            </p>
          </div>
          <button
            onClick={runAgents}
            disabled={isRunning || !selectedShipment}
            className="bg-black text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isRunning
              ? "Running agents..."
              : "Pay 0.005 USDC and analyze shipment"}
          </button>
        </div>

        {selectedShipment && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold">Selected shipment</p>
            <p>{selectedShipment.reference}</p>
            <p>{formatLane(selectedShipment.origin, selectedShipment.destination)}</p>
            <p>Revenue: {selectedShipment.revenue} {selectedShipment.currency}</p>
            <p>Pickup: {selectedShipment.pickupWindow}</p>
          </div>
        )}
      </section>

      {run && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {run.agents.map((agent) => (
            <div className="border p-4 rounded-xl space-y-2" key={agent.name}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{agent.name}</h3>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs uppercase">
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-gray-700">{agent.summary}</p>
              <pre className="text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap overflow-auto">
                {formatDetails(agent.details)}
              </pre>
            </div>
          ))}
        </section>
      )}

      {run && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border p-4 rounded-xl space-y-2">
            <h2 className="font-bold">Recommendation</h2>
            <p className="text-2xl font-bold">{run.recommendation.decision}</p>
            <p>Confidence: {run.recommendation.confidence}%</p>
            <p>Source: {run.recommendation.source}</p>
            <p className="text-sm text-gray-700">{run.recommendation.reason}</p>
            <div className="text-sm text-gray-600">
              <p>Distance: {run.economics.distanceKm} km</p>
              <p>ETA: {run.economics.eta}</p>
              <p>Route source: {run.economics.routeSource}</p>
              <p>
                Gross profit: {run.economics.grossProfit} {run.economics.currency}
              </p>
              <p>Risk: {run.risk.level} ({run.risk.score}/100)</p>
            </div>
          </div>

          <div className="border p-4 rounded-xl space-y-2 break-words">
            <h2 className="font-bold">On-chain Proof</h2>
            {payment && (
              <div className="text-sm space-y-1">
                <p>Network: {payment.network}</p>
                <p>Fee: {payment.amount} {payment.currency}</p>
                <p>Transaction ID: {payment.transactionId}</p>
                <p>Status: {paymentStatus?.state ?? payment.state}</p>
                <p>From: {payment.sourceWalletAddress}</p>
                <p>To: {payment.destinationAddress}</p>
                <p>Token: {payment.tokenAddress}</p>
                {paymentStatus?.txHash && <p>Tx hash: {paymentStatus.txHash}</p>}
                {(paymentStatus?.explorerUrl || payment.explorerBaseUrl) && (
                  <a
                    className="text-emerald-700 underline"
                    href={paymentStatus?.explorerUrl ?? payment.explorerBaseUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Arc Testnet proof
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
