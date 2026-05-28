import { NextResponse } from "next/server";
import { calculateProfit } from "@/lib/profit";
import { analyzeRouteWithGemini } from "@/lib/gemini";
import { getRouteMetrics } from "@/lib/googleRoutes";

export async function GET() {
  const route = await getRouteMetrics();
  const profitData = calculateProfit(route.distanceMiles);
  const marginPercent = Number(((profitData.profit / profitData.revenue) * 100).toFixed(1));
  const rpm = Number((profitData.revenue / Math.max(route.distanceMiles, 1)).toFixed(2));

  const aiResult = await analyzeRouteWithGemini({
    deadheadMiles: 0,
    loadedMiles: route.distanceMiles,
    totalMiles: route.distanceMiles,
    revenue: profitData.revenue,
    fuelCost: profitData.fuelCost,
    driverCost: profitData.driverCost,
    grossProfit: profitData.profit,
    marginPercent,
    rpmLoaded: rpm,
    rpmTotal: rpm,
    estimatedDetentionCost: 0,
    estimatedTollCost: 0,
    waitingCostEstimate: 0,
    trueNetProfit: profitData.profit,
    trueMarginPercent: marginPercent,
    riskScore: profitData.profit > 100 ? 35 : 70,
    weatherRiskLevel: "low",
    weatherSummary: "Legacy analysis endpoint uses fallback weather context.",
    historicalLaneScore: 68,
    historicalRiskNote: "Legacy analysis endpoint uses global fallback lane context.",
  });

  return NextResponse.json({
    distanceMiles: route.distanceMiles,
    eta: route.eta,
    routeSource: route.source,
    encodedPolyline: "encodedPolyline" in route ? route.encodedPolyline : null,
    ...profitData,
    ai: aiResult,
  });
}
