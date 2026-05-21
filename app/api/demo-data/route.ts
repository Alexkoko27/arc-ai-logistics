import { NextResponse } from "next/server";
import { shipments, vehicles } from "@/lib/demoData";

export async function GET() {
  return NextResponse.json({
    vehicles,
    shipments,
    agentFee: {
      amount: process.env.AGENT_ANALYSIS_FEE_USDC ?? "0.005",
      currency: "USDC",
      network: "Arc Testnet",
    },
  });
}
