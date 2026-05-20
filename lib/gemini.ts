import { GoogleGenAI } from "@google/genai";

export async function analyzeRouteWithGemini(
  distanceKm: number,
  eta: string,
  profit: number,
) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      recommendation: profit > 100 ? "BOOK" : "SKIP",
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
You are a logistics AI agent.

Analyze:
Distance: ${distanceKm} km
ETA: ${eta}
Profit: ${profit} USD

Return JSON only:
{
  "recommendation": "BOOK or SKIP",
  "confidence": 0-100,
  "reason": "short reason"
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
      recommendation: profit > 100 ? "BOOK" : "SKIP",
      confidence: 55,
      reason: "Fallback rule used because AI analysis failed.",
      source: "fallback",
    };
  }
}
