import { NextResponse } from "next/server";
import { shipments, vehicles } from "@/lib/demoData";
import { compareAllTruckLoadMatches } from "@/lib/agentRun";
import { rankShipments } from "@/lib/optimizer/rankShipments";

export async function GET() {
  return NextResponse.json({
    vehicles,
    shipments,
    comparisons: compareAllTruckLoadMatches(),
    rankedShipments: rankShipments(shipments),
    agentFee: {
      amount: process.env.AGENT_ANALYSIS_FEE_USDC ?? "0.005",
      currency: "USDC",
      network: "Arc Testnet",
    },
  });
}
