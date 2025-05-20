import React, { useRef, useState } from "react";
import {
  useInitializeMap,
  useManageMarkers,
  useClearMarkersOnUnmount,
} from "@/hooks/maps";

export type MarkerData = {
  id: string;
  position: google.maps.LatLngLiteral;
  title?: string;
};

type MapsProps = {
  apiKey: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  markers?: MarkerData[];
  onStateChange?: (state: {
    center: google.maps.LatLngLiteral;
    zoom: number;
  }) => void;
};

const DEFAULT_CENTER = { lat: 51.1657, lng: 10.4515 };
const DEFAULT_ZOOM = 6;

const Maps = ({
  apiKey,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  markers = [],
  onStateChange,
}: MapsProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null!);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerInstancesRef = useRef<Map<string, google.maps.Marker>>(new Map());

  useInitializeMap({
    apiKey,
    mapContainerRef,
    initialCenter,
    initialZoom,
    onStateChange,
    setMap,
  });

  useManageMarkers(map, markers, markerInstancesRef);

  useClearMarkersOnUnmount(markerInstancesRef);

  return (
    <div
      ref={mapContainerRef}
      id="map"
      className="w-full h-full"
      style={{ minHeight: "300px" }}
    />
  );
};

export default Maps;
