import { useEffect } from "react";
import { loadGoogleMaps } from "@/lib/utils/loadLocation";
import { MarkerData } from "@/components/maps/Maps";

type UseInitializeMapProps = {
  apiKey: string;
  mapContainerRef: React.RefObject<HTMLDivElement>;
  initialCenter: google.maps.LatLngLiteral;
  initialZoom: number;
  onStateChange?: (state: {
    center: google.maps.LatLngLiteral;
    zoom: number;
  }) => void;
  setMap: (map: google.maps.Map) => void;
};

export const useInitializeMap = ({
  apiKey,
  mapContainerRef,
  initialCenter,
  initialZoom,
  onStateChange,
  setMap,
}: UseInitializeMapProps) => {
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        await loadGoogleMaps(apiKey);
        if (!isMounted) return;

        const newMap = new google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        });

        newMap.addListener("idle", () => {
          if (onStateChange && isMounted) {
            const center = newMap.getCenter();
            const zoom = newMap.getZoom();
            if (center && zoom !== undefined) {
              onStateChange({
                center: center.toJSON(),
                zoom: zoom,
              });
            }
          }
        });

        setMap(newMap);
      } catch (error) {
        console.error("Error loading or initializing Google Maps:", error);
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML =
            '<p class="text-red-500 text-center p-4">Could not load map.</p>';
        }
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
    };
  }, [
    apiKey,
    mapContainerRef,
    initialCenter,
    initialZoom,
    onStateChange,
    setMap,
  ]);
};

export const useManageMarkers = (
  map: google.maps.Map | null,
  markers: MarkerData[],
  markerInstancesRef: React.MutableRefObject<Map<string, google.maps.Marker>>
) => {
  useEffect(() => {
    if (!map) return;

    const currentMarkerInstances = markerInstancesRef.current;
    const newMarkerInstances = new Map<string, google.maps.Marker>();

    markers.forEach((markerData) => {
      if (currentMarkerInstances.has(markerData.id)) {
        const existingMarker = currentMarkerInstances.get(markerData.id)!;
        newMarkerInstances.set(markerData.id, existingMarker);
        currentMarkerInstances.delete(markerData.id);
      } else {
        const newMarker = new google.maps.Marker({
          position: markerData.position,
          map: map,
          title: markerData.title,
        });
        newMarkerInstances.set(markerData.id, newMarker);
      }
    });

    currentMarkerInstances.forEach((markerToRemove) => {
      markerToRemove.setMap(null);
    });

    markerInstancesRef.current = newMarkerInstances;
  }, [map, markers, markerInstancesRef]);
};

export const useClearMarkersOnUnmount = (
  markerInstancesRef: React.MutableRefObject<Map<string, google.maps.Marker>>
) => {
  useEffect(() => {
    const ref = markerInstancesRef; // Capture ref for cleanup
    return () => {
      if (ref.current) {
        ref.current.forEach((marker) => {
          marker.setMap(null);
        });
        ref.current.clear();
      }
    };
  }, [markerInstancesRef]);
};
