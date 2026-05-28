import { Coordinates, Shipment } from "@/lib/demoData";

export type WeatherRiskResult = {
  source: "openweather" | "fallback";
  riskLevel: "low" | "medium" | "high";
  weatherWeight: number;
  riskScoreDelta: number;
  summary: string;
  reasons: string[];
  checkedAt: string;
};

type OpenWeatherResponse = {
  weather?: Array<{ main?: string; description?: string }>;
  main?: { temp?: number };
  wind?: { speed?: number };
  visibility?: number;
  rain?: Record<string, number>;
  snow?: Record<string, number>;
};

type PointRisk = {
  score: number;
  reasons: string[];
};

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fallbackWeatherRisk(reason: string): WeatherRiskResult {
  return {
    source: "fallback",
    riskLevel: "low",
    weatherWeight: 0.03,
    riskScoreDelta: 3,
    summary: "Fallback weather risk: live OpenWeather data unavailable; conservative low risk applied.",
    reasons: [reason],
    checkedAt: new Date().toISOString(),
  };
}

function evaluateWeatherPoint(label: string, data: OpenWeatherResponse): PointRisk {
  const reasons: string[] = [];
  let score = 0;
  const weatherText = (data.weather ?? [])
    .map((item) => `${item.main ?? ""} ${item.description ?? ""}`.toLowerCase())
    .join(" ");
  const windSpeed = data.wind?.speed ?? 0;
  const temp = data.main?.temp;
  const visibilityMiles = typeof data.visibility === "number" ? data.visibility / 1609.344 : null;

  if (weatherText.includes("thunderstorm")) {
    score += 12;
    reasons.push(`${label}: thunderstorm risk reported.`);
  }

  if (data.snow || weatherText.includes("snow")) {
    score += 10;
    reasons.push(`${label}: snow risk reported.`);
  }

  if (data.rain || weatherText.includes("rain")) {
    score += 5;
    reasons.push(`${label}: rain may slow pickup or delivery operations.`);
  }

  if (windSpeed >= 35) {
    score += 8;
    reasons.push(`${label}: high wind speed near ${Math.round(windSpeed)} mph.`);
  } else if (windSpeed >= 25) {
    score += 4;
    reasons.push(`${label}: elevated wind speed near ${Math.round(windSpeed)} mph.`);
  }

  if (typeof temp === "number" && (temp <= 15 || temp >= 100)) {
    score += 6;
    reasons.push(`${label}: extreme temperature near ${Math.round(temp)}F.`);
  }

  if (visibilityMiles !== null && visibilityMiles < 3) {
    score += 8;
    reasons.push(`${label}: low visibility below 3 miles.`);
  }

  if (reasons.length === 0) {
    reasons.push(`${label}: no major live weather risk flags.`);
  }

  return { score, reasons };
}

async function fetchOpenWeatherPoint(point: Coordinates) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is missing.");
  }

  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    units: "imperial",
    appid: apiKey,
  });
  const response = await fetch(`${OPENWEATHER_URL}?${params.toString()}`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`OpenWeather request failed with ${response.status}.`);
  }

  return (await response.json()) as OpenWeatherResponse;
}

export function getFallbackWeatherRisk(shipment: Shipment, reason?: string): WeatherRiskResult {
  return fallbackWeatherRisk(
    reason ??
      `Fallback weather risk for ${shipment.origin.state} -> ${shipment.destination.state}; live OpenWeather data not used for this calculation.`,
  );
}

export async function getWeatherRisk(shipment: Shipment): Promise<WeatherRiskResult> {
  try {
    const [originWeather, destinationWeather] = await Promise.all([
      fetchOpenWeatherPoint(shipment.origin),
      fetchOpenWeatherPoint(shipment.destination),
    ]);
    const originRisk = evaluateWeatherPoint(
      `${shipment.origin.city}, ${shipment.origin.state}`,
      originWeather,
    );
    const destinationRisk = evaluateWeatherPoint(
      `${shipment.destination.city}, ${shipment.destination.state}`,
      destinationWeather,
    );
    const rawScore = Math.max(originRisk.score, destinationRisk.score);
    const riskScoreDelta = clamp(Math.round(rawScore), 2, 15);
    const riskLevel = riskScoreDelta >= 11 ? "high" : riskScoreDelta >= 6 ? "medium" : "low";

    return {
      source: "openweather",
      riskLevel,
      weatherWeight: riskLevel === "high" ? 0.15 : riskLevel === "medium" ? 0.09 : 0.04,
      riskScoreDelta,
      summary: `Live weather risk is ${riskLevel} for ${shipment.origin.city} -> ${shipment.destination.city}.`,
      reasons: [...originRisk.reasons, ...destinationRisk.reasons],
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "OpenWeather request failed.";
    return fallbackWeatherRisk(reason);
  }
}
