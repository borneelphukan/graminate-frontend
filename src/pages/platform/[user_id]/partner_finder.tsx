import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import FinderBar from "@/components/layout/FinderBar";
import NavPanel from "@/components/layout/NavPanel";
import Maps, { MarkerData } from "@/components/maps/Maps";
import PlatformLayout from "@/layout/PlatformLayout";
import { getCurrentLocation } from "@/lib/utils/loadLocation";
import Loader from "@/components/ui/Loader";

type View = "distributor" | "exporter" | "factories";

type Button = {
  name: string;
  view: View;
};

const buttons: Button[] = [
  { name: "Distributor", view: "distributor" },
  { name: "Exporter", view: "exporter" },
  { name: "Factories", view: "factories" },
];

type MapState = {
  center: google.maps.LatLngLiteral;
  zoom: number;
};

const PartnerFinder = () => {
  const [activeView, setActiveView] = useState<View>("distributor");
  const [mapState, setMapState] = useState<MapState>({
    center: { lat: 51.1657, lng: 10.4515 },
    zoom: 6,
  });
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleNavigation = useCallback((newView: View) => {
    setActiveView(newView);
  }, []);

  const handleMapStateChange = useCallback(
    (state: { center: google.maps.LatLngLiteral; zoom: number }) => {
      setMapState(state);
    },
    []
  );

  useEffect(() => {
    setIsLoading(true);
    getCurrentLocation()
      .then((location) => {
        setMapState({
          center: { lat: location.lat, lng: location.lon },
          zoom: 12,
        });
        setError(null);
      })
      .catch((err) => {
        console.error("Geolocation error:", err);
        setError(
          err.message || "Could not retrieve location. Showing default map."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchMarkers = async () => {

      await new Promise((resolve) => setTimeout(resolve, 500));
      let fetchedMarkers: MarkerData[] = [];

      switch (activeView) {
        case "distributor":
          fetchedMarkers = [
            {
              id: "d1",
              position: {
                lat: mapState.center.lat + 0.01,
                lng: mapState.center.lng + 0.01,
              },
              title: "Distributor 1",
            },
            {
              id: "d2",
              position: {
                lat: mapState.center.lat - 0.02,
                lng: mapState.center.lng - 0.01,
              },
              title: "Distributor 2",
            },
          ];
          break;
        case "exporter":
          fetchedMarkers = [
            {
              id: "e1",
              position: {
                lat: mapState.center.lat + 0.03,
                lng: mapState.center.lng - 0.02,
              },
              title: "Exporter A",
            },
          ];
          break;
        case "factories":
          fetchedMarkers = [
            {
              id: "f1",
              position: {
                lat: mapState.center.lat - 0.01,
                lng: mapState.center.lng + 0.03,
              },
              title: "Factory X",
            },
            {
              id: "f2",
              position: {
                lat: mapState.center.lat + 0.01,
                lng: mapState.center.lng - 0.03,
              },
              title: "Factory Y",
            },
            {
              id: "f3",
              position: {
                lat: mapState.center.lat - 0.02,
                lng: mapState.center.lng + 0.02,
              },
              title: "Factory Z",
            },
          ];
          break;
      }
      setMarkers(fetchedMarkers);
    };

    if (!isLoading) {
      fetchMarkers();
    }
  }, [activeView, isLoading, mapState.center]);

  return (
    <PlatformLayout>
      <Head>
        <title>Partner Finder | Graminate</title>
      </Head>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-3 sm:p-4 z-20 ">
          <NavPanel
            buttons={buttons}
            activeView={activeView}
            onNavigate={(view: string) => handleNavigation(view as View)}
          />
        </div>

        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 z-10 mx-4 mt-2"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <aside className="min-w-fit flex-shrink-0 overflow-y-auto bg-white p-4 hidden lg:block z-10">
            <FinderBar activeView={activeView} />
          </aside>

          <main className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-30">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <Loader />
                </div>
              </div>
            )}

            {!apiKey ? (
              <div className="p-6 text-red-600 font-semibold">
                Error: Google Maps API key is not configured. Please set
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
              </div>
            ) : (
              <div className="absolute inset-0">
                <Maps
                  apiKey={apiKey}
                  initialCenter={mapState.center}
                  initialZoom={mapState.zoom}
                  onStateChange={handleMapStateChange}
                  markers={markers}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </PlatformLayout>
  );
};

export default PartnerFinder;
