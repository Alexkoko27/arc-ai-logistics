"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import { cargoLocation, truckLocation } from "@/lib/routeData";

type AiAnalysis = {
  recommendation?: string;
  confidence?: number;
  reason?: string;
  source?: string;
};

type AnalysisResponse = {
  distance: number;
  eta: string;
  revenue: number;
  fuelCost: number;
  driverCost: number;
  profit: number;
  decision: string;
  routeSource?: string;
  encodedPolyline?: string | null;
  ai: AiAnalysis | string;
};

type PaymentResponse = {
  success: boolean;
  txHash?: string;
  status?: string;
  message?: string;
  network?: string;
  chainId?: string;
  walletAddress?: string;
  explorer?: string;
};

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function formatAiAnalysis(ai: AiAnalysis | string) {
  if (typeof ai === "string") return ai;

  return [
    ai.recommendation && `Recommendation: ${ai.recommendation}`,
    typeof ai.confidence === "number" && `Confidence: ${ai.confidence}%`,
    ai.reason && `Reason: ${ai.reason}`,
    ai.source && `Source: ${ai.source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);

  useEffect(() => {
    fetch("/api/analyze")
      .then((r) => r.json())
      .then((data: AnalysisResponse) => setAnalysis(data));
  }, []);

  async function reserve() {
    const r = await fetch("/api/pay", {
      method: "POST",
    });

    const data = (await r.json()) as PaymentResponse;
    setPayment(data);
  }

  return (
    <main className="p-8 space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-gray-500">
          Arc Testnet logistics MVP
        </p>
        <h1 className="text-3xl font-bold">Arc AI Logistics Demo</h1>
      </header>

      <MapView />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-blue-500 p-4 rounded-xl space-y-2">
          <h3 className="font-bold text-blue-600">Truck GPS Agent</h3>
          <p className="text-sm text-gray-600">Current truck location</p>
          <div className="text-sm space-y-1">
            <p>{truckLocation.city}</p>
            <p>
              {formatCoordinate(truckLocation.lat)}, {formatCoordinate(truckLocation.lng)}
            </p>
          </div>
        </div>

        <div className="border border-green-500 p-4 rounded-xl space-y-2">
          <h3 className="font-bold text-green-600">Cargo Location Agent</h3>
          <p className="text-sm text-gray-600">Cargo pickup location</p>
          <div className="text-sm space-y-1">
            <p>{cargoLocation.city}</p>
            <p>
              {formatCoordinate(cargoLocation.lat)}, {formatCoordinate(cargoLocation.lng)}
            </p>
          </div>
        </div>

        <div className="border border-amber-500 p-4 rounded-xl space-y-2">
          <h3 className="font-bold text-amber-600">Route Economics Agent</h3>
          <p className="text-sm text-gray-600">Route economics</p>
          {analysis ? (
            <div className="text-sm space-y-1">
              <p>Distance: {analysis.distance} km</p>
              <p>ETA: {analysis.eta}</p>
              <p>Profit: ${analysis.profit}</p>
              <p>Source: {analysis.routeSource ?? "unknown"}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading analysis...</p>
          )}
        </div>

        <div className="border border-purple-500 p-4 rounded-xl lg:col-span-2 space-y-2">
          <h3 className="font-bold text-purple-600">AI Decision Agent</h3>
          <p className="text-sm text-gray-600">AI recommendation</p>
          {analysis ? (
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
              {formatAiAnalysis(analysis.ai)}
            </pre>
          ) : (
            <p className="text-sm text-gray-500">Waiting for route economics...</p>
          )}
        </div>

        <div className="border border-emerald-500 p-4 rounded-xl space-y-2">
          <h3 className="font-bold text-emerald-600">Payment Agent</h3>
          <p className="text-sm text-gray-600">Circle and Arc payment status</p>
          {payment ? (
            <div className="text-sm space-y-1 break-words">
              <p>Success: {String(payment.success)}</p>
              {payment.network && <p>Network: {payment.network}</p>}
              {payment.chainId && <p>Chain ID: {payment.chainId}</p>}
              {payment.status && <p>Status: {payment.status}</p>}
              {payment.txHash && <p>Tx: {payment.txHash}</p>}
              {payment.walletAddress && <p>Wallet: {payment.walletAddress}</p>}
              {payment.explorer && (
                <a
                  className="text-emerald-700 underline"
                  href={payment.explorer}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Arc explorer
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not reserved yet.</p>
          )}
        </div>
      </section>

      {analysis && (
        <section className="border p-4 rounded-xl space-y-1">
          <h2 className="font-bold">AI Analysis</h2>

          <p>Distance: {analysis.distance} km</p>
          <p>ETA: {analysis.eta}</p>
          <p>Revenue: ${analysis.revenue}</p>
          <p>Fuel: ${analysis.fuelCost}</p>
          <p>Driver: ${analysis.driverCost}</p>
          <p>Profit: ${analysis.profit}</p>
          <p>
            Decision:
            <strong> {analysis.decision}</strong>
          </p>

          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
            {formatAiAnalysis(analysis.ai)}
          </pre>
        </section>
      )}

      <button
        onClick={reserve}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Reserve with USDC
      </button>

      {payment && (
        <div>
          Success:{" "}
          {payment.txHash ??
            payment.status ??
            payment.message ??
            String(payment.success)}
        </div>
      )}
    </main>
  );
}
