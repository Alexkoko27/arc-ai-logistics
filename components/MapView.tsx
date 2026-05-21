"use client";

import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from "@react-google-maps/api";

import { truckLocation, cargoLocation } from "@/lib/routeData";

type MapPoint = {
  lat: number;
  lng: number;
};

type MapViewProps = {
  origin?: MapPoint;
  destination?: MapPoint;
  height?: number;
};

function getCenter(origin: MapPoint, destination: MapPoint) {
  return {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };
}

export default function MapView({
  origin = truckLocation,
  destination = cargoLocation,
  height = 360,
}: MapViewProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });
  const path = [origin, destination];
  const center = getCenter(origin, destination);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      key={`${origin.lat}-${origin.lng}-${destination.lat}-${destination.lng}`}
      zoom={6}
      center={center}
      mapContainerStyle={{
        width: "100%",
        height: `${height}px`,
      }}
    >
      <Marker position={origin} label="A" />
      <Marker position={destination} label="B" />

      <Polyline
        path={path}
        options={{
          strokeColor: "#111827",
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }}
      />
    </GoogleMap>
  );
}
