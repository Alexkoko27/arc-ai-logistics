import { NextResponse } from "next/server";
import { calculateProfit } from "@/lib/profit";
import { analyzeRouteWithGemini } from "@/lib/gemini";
import { getRouteMetrics } from "@/lib/googleRoutes";

export async function GET() {
  let route;

  try {
    route = await getRouteMetrics();
  } catch {
    route = {
      distanceKm: 289,
      eta: "3h 45m",
      source: "fallback",
    };
  }

  const profitData = calculateProfit(route.distanceKm);

  const aiResult = await analyzeRouteWithGemini(
    route.distanceKm,
    route.eta,
    profitData.profit,
  );

  return NextResponse.json({
    distance: route.distanceKm,
    eta: route.eta,
    routeSource: route.source,
    encodedPolyline: "encodedPolyline" in route ? route.encodedPolyline : null,
    ...profitData,
    ai: aiResult,
  });
}
