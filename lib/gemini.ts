import { GoogleGenAI } from "@google/genai";

type GeminiTruckingInput = {
  deadheadMiles: number;
  loadedMiles: number;
  totalMiles: number;
  revenue: number;
  fuelCost: number;
  driverCost: number;
  grossProfit: number;
  marginPercent: number;
  rpmLoaded: number;
  rpmTotal: number;
  riskScore: number;
};

function fallbackDecision(input: GeminiTruckingInput) {
  if (
    input.grossProfit > 350 &&
    input.marginPercent >= 15 &&
    input.rpmTotal >= 1.75 &&
    input.riskScore < 60
  ) {
    return "BOOK";
  }

  if (input.grossProfit > 100 && input.rpmTotal >= 1.35 && input.riskScore < 75) {
    return "WAIT";
  }

  return "SKIP";
}

export async function analyzeRouteWithGemini(input: GeminiTruckingInput) {
  const fallbackRecommendation = fallbackDecision(input);

  if (!process.env.GEMINI_API_KEY) {
    return {
      recommendation: fallbackRecommendation,
      confidence: 65,
      reason: "Fallback rule used because GEMINI_API_KEY is missing.",
      source: "fallback",
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are a US trucking dispatch AI agent.

Analyze this dry van load match using miles and USDC/USD economics:
Deadhead miles: ${input.deadheadMiles}
Loaded miles: ${input.loadedMiles}
Total miles: ${input.totalMiles}
Revenue: ${input.revenue} USDC
Fuel cost: ${input.fuelCost} USDC
Driver cost: ${input.driverCost} USDC
Gross profit: ${input.grossProfit} USDC
Margin percent: ${input.marginPercent}%
RPM loaded: ${input.rpmLoaded} USDC/mile
RPM total: ${input.rpmTotal} USDC/mile
Risk score: ${input.riskScore}/100

Return JSON only:
{
  "recommendation": "BOOK" | "WAIT" | "SKIP",
  "confidence": 0-100,
  "reason": "short dispatch reason"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "{}";
    const jsonText = text.replace(/```json|```/g, "").trim();

    return {
      ...JSON.parse(jsonText),
      source: "gemini",
    };
  } catch {
    return {
      recommendation: fallbackRecommendation,
      confidence: 55,
      reason: "Fallback rule used because AI analysis failed.",
      source: "fallback",
    };
  }
}
