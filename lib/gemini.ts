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
  estimatedDetentionCost: number;
  estimatedTollCost: number;
  waitingCostEstimate: number;
  trueNetProfit: number;
  trueMarginPercent: number;
  riskScore: number;
  weatherRiskLevel: "low" | "medium" | "high";
  weatherSummary: string;
  historicalLaneScore: number;
  historicalRiskNote: string;
};

function fallbackDecision(input: GeminiTruckingInput) {
  if (
    input.trueNetProfit > 300 &&
    input.trueMarginPercent >= 14 &&
    input.rpmTotal >= 1.7 &&
    input.riskScore < 60
  ) {
    return "BOOK";
  }

  if (input.trueNetProfit > 75 && input.rpmTotal >= 1.3 && input.riskScore < 76) {
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
Gross profit before detention/tolls/waiting: ${input.grossProfit} USDC
Margin percent before detention/tolls/waiting: ${input.marginPercent}%
Estimated detention cost: ${input.estimatedDetentionCost} USDC
Estimated toll cost: ${input.estimatedTollCost} USDC
Estimated waiting cost: ${input.waitingCostEstimate} USDC
True net profit: ${input.trueNetProfit} USDC
True margin percent: ${input.trueMarginPercent}%
RPM loaded: ${input.rpmLoaded} USDC/mile
RPM total: ${input.rpmTotal} USDC/mile
Risk score: ${input.riskScore}/100
Weather risk level: ${input.weatherRiskLevel}
Weather summary: ${input.weatherSummary}
Historical lane score: ${input.historicalLaneScore}/100
Historical lane note: ${input.historicalRiskNote}

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
