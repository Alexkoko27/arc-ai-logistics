"use client";

import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from "@react-google-maps/api";

import { truckLocation, cargoLocation } from "@/lib/routeData";

const containerStyle = {
  width: "100%",
  height: "500px",
};

export default function MapView() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      zoom={6}
      center={truckLocation}
      mapContainerStyle={containerStyle}
    >
      <Marker position={truckLocation} />
      <Marker position={cargoLocation} />

      <Polyline path={[truckLocation, cargoLocation]} />
    </GoogleMap>
  );
}
