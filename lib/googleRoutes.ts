import { cargoLocation, truckLocation } from "@/lib/routeData";

type RoutePoint = {
  lat: number;
  lng: number;
};

const METERS_PER_MILE = 1609.344;

function formatDuration(duration: string) {
  const seconds = Number(duration.replace("s", ""));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function estimateFallbackDistanceMiles(
  origin: RoutePoint,
  destination: RoutePoint,
) {
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const directDistanceMiles =
    earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((directDistanceMiles * 1.22).toFixed(1));
}

function estimateFallbackEta(distanceMiles: number) {
  const averageSpeedMph = 58;
  const totalMinutes = Math.round((distanceMiles / averageSpeedMph) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function fallbackRouteMetrics(
  origin: RoutePoint,
  destination: RoutePoint,
  source: string,
) {
  const distanceMiles = estimateFallbackDistanceMiles(origin, destination);

  return {
    distanceMiles,
    eta: estimateFallbackEta(distanceMiles),
    source,
  };
}

export async function getRouteMetrics(
  origin: RoutePoint = truckLocation,
  destination: RoutePoint = cargoLocation,
) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    return fallbackRouteMetrics(origin, destination, "fallback-no-google-key");
  }

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          languageCode: "en-US",
          units: "IMPERIAL",
        }),
      },
    );

    if (!response.ok) {
      return fallbackRouteMetrics(
        origin,
        destination,
        `fallback-google-routes-${response.status}`,
      );
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      return fallbackRouteMetrics(
        origin,
        destination,
        "fallback-google-routes-empty",
      );
    }

    return {
      distanceMiles: Number((route.distanceMeters / METERS_PER_MILE).toFixed(1)),
      eta: formatDuration(route.duration),
      encodedPolyline: route.polyline?.encodedPolyline,
      source: "google-routes",
    };
  } catch {
    return fallbackRouteMetrics(
      origin,
      destination,
      "fallback-google-routes-error",
    );
  }
}
