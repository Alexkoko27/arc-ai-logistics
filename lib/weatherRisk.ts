import { Shipment } from "@/lib/demoData";

export type WeatherRisk = {
  scoreImpact: number;
  factors: string[];
  source: "placeholder";
};

export function getWeatherRiskPlaceholder(shipment: Shipment): WeatherRisk {
  // TODO: Connect live weather data for pickup, linehaul, and delivery markets.
  // Optional future env var: OPENWEATHER_API_KEY=
  return {
    scoreImpact: 4,
    factors: [
      `Weather risk placeholder for ${shipment.origin.state} -> ${shipment.destination.state}; live weather API not connected yet.`,
    ],
    source: "placeholder",
  };
}
