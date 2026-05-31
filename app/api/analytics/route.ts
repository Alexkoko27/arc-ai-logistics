import { NextResponse } from "next/server";
import { getAgentMetrics } from "@/lib/analytics/agentMetrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAgentMetrics());
}
