"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/MapView";

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
      <h1 className="text-3xl font-bold">Arc AI Logistics Demo</h1>
      <MapView />

      {/* === AGENTS CHAIN === */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        suppressHydrationWarning
      >
        <div className="border border-blue-500 p-4 rounded-xl">
          <h3 className="font-bold text-blue-600">🚛 Truck GPS Agent</h3>
          <p className="text-sm mt-2">Current Truck Location</p>
        </div>

        <div className="border border-green-500 p-4 rounded-xl">
          <h3 className="font-bold text-green-600">📦 Cargo Location Agent</h3>
          <p className="text-sm mt-2">Cargo Current Location</p>
        </div>

        <div className="border border-amber-500 p-4 rounded-xl">
          <h3 className="font-bold text-amber-600">📊 Route Economics Agent</h3>
          <p className="text-sm mt-2">Route Economics</p>
          {analysis && (
            <div className="text-sm mt-2 space-y-1">
              <p>Distance: {analysis.distance} km</p>
              <p>ETA: {analysis.eta}</p>
              <p>Profit: ${analysis.profit}</p>
            </div>
          )}
        </div>

        <div className="border border-purple-500 p-4 rounded-xl lg:col-span-2">
          <h3 className="font-bold text-purple-600">🤖 AI Decision Agent</h3>
          <p className="text-sm mt-2">AI Recommendation</p>
          {analysis && (
            <pre className="text-sm bg-gray-100 p-3 rounded mt-2 overflow-auto">
              {typeof analysis.ai === "string"
                ? analysis.ai
                : JSON.stringify(analysis.ai, null, 2)}
            </pre>
          )}
        </div>

        <div className="border border-emerald-500 p-4 rounded-xl">
          <h3 className="font-bold text-emerald-600">💰 Payment Agent</h3>
          <p className="text-sm mt-2">Payment & Transaction</p>
          {payment && (
            <div className="text-sm mt-2 space-y-1">
              <p>Success: {String(payment.success)}</p>
              {payment.txHash && <p>Tx: {payment.txHash}</p>}
              {payment.status && <p>Status: {payment.status}</p>}
              {payment.walletAddress && <p>Wallet: {payment.walletAddress}</p>}
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <div className="border p-4 rounded-xl space-y-1">
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

          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {typeof analysis.ai === "string"
              ? analysis.ai
              : JSON.stringify(analysis.ai, null, 2)}
          </pre>
        </div>
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
