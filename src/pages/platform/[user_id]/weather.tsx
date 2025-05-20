import React, { useState, useEffect } from "react";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import Loader from "@/components/ui/Loader";
import SunCard from "@/components/cards/weather/SunCard";
import UVCard from "@/components/cards/weather/UVCard";
import TemperatureCard from "@/components/cards/weather/TemperatureCard";
import PrecipitationCard from "@/components/cards/weather/PrecipitationCard";

import { getCurrentLocation } from "@/lib/utils/loadLocation";

const Weather = () => {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocation(null);
    setError(null);

    getCurrentLocation()
      .then((coords) => setLocation(coords))
      .catch((err) => {
        console.error("Geolocation Error:", err);
        let errorMessage =
          "Could not retrieve location. Please try again or enable location services.";

        if (err.code) {
          switch (err.code) {
            case err.PERMISSION_DENIED || 1:
              errorMessage =
                "Location access was denied. Please enable location permissions in your browser settings.";
              break;
            case err.POSITION_UNAVAILABLE || 2:
              errorMessage =
                "Location information is unavailable. Please check your network connection.";
              break;
            case err.TIMEOUT || 3:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }
        }

        setError(errorMessage);
      });
  }, []);

  return (
    <>
      <Head>
        <title>Graminate | Weather</title>
        <meta
          name="description"
          content="Check the current weather conditions based on your location."
        />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen container mx-auto p-4">
          <header className="mb-2">
            <h1 className="text-lg font-semibold dark:text-white">Weather</h1>
          </header>

          <hr className="border-gray-200 dark:border-gray-700 mb-8" />

          <div className="min-h-[400px]">
            {error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-600 dark:text-red-400 text-center px-4 py-10 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm">
                  {error}
                </p>
              </div>
            ) : !location ? (
              <div className="flex items-center justify-center h-full pt-16">
                <Loader />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="w-full">
                  <TemperatureCard lat={location.lat} lon={location.lon} />
                </div>
                <div className="w-full">
                  <UVCard lat={location.lat} lon={location.lon} />
                </div>
                <div className="w-full">
                  <SunCard lat={location.lat} lon={location.lon} />
                </div>
                <div className="w-full">
                  <PrecipitationCard lat={location.lat} lon={location.lon} />
                </div>
              </div>
            )}
          </div>
        </main>
      </PlatformLayout>
    </>
  );
};

export default Weather;
