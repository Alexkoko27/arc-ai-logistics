import { cargoLocation, truckLocation } from "@/lib/routeData";

function formatDuration(duration: string) {
  const seconds = Number(duration.replace("s", ""));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export async function getRouteMetrics() {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    return {
      distanceKm: 289,
      eta: "3h 45m",
      source: "fallback",
    };
  }

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
              latitude: truckLocation.lat,
              longitude: truckLocation.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: cargoLocation.lat,
              longitude: cargoLocation.lng,
            },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "en-US",
        units: "METRIC",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Routes failed: ${response.status}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    throw new Error("Google Routes returned no route");
  }

  return {
    distanceKm: Number((route.distanceMeters / 1000).toFixed(1)),
    eta: formatDuration(route.duration),
    encodedPolyline: route.polyline?.encodedPolyline,
    source: "google-routes",
  };
}
