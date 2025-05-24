import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import QualityCard from "@/components/cards/fishery/QualityCard";
import ConditionCard from "@/components/cards/fishery/ConditionCard";
import InventoryStockCard from "@/components/cards/InventoryStock";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import axios from "axios";
import axiosInstance from "@/lib/utils/axiosInstance";
import TaskManager from "@/components/cards/TaskManager";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import AlertDisplay from "@/components/ui/AlertDisplay";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import FisheryForm from "@/components/form/FisheryForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFishFins,
  faWater,
  faInfoCircle,
  faClipboardList,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type FisheryRecord = {
  fishery_id: number;
  user_id: number;
  fishery_type: string;
  target_species: string;
  feed_type: string;
  notes?: string;
  created_at: string;
};

type WeatherData = {
  temperature: number;
  humidity: number;
  lightHours: number | null;
  rainfall: number | null;
  surfacePressure: number | null;
  timestamp: number;
};

type ItemRecord = {
  inventory_id: number;
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  created_at: string;
  price_per_unit: number;
  warehouse_id: number | null;
  minimum_limit?: number;
  status?: string;
};

const FisheryDetail = () => {
  const router = useRouter();
  const { user_id, id: fisheryIdFromRoute } = router.query;

  const parsedUserIdString = Array.isArray(user_id) ? user_id[0] : user_id;
  const numericUserId = parsedUserIdString
    ? parseInt(parsedUserIdString, 10)
    : undefined;

  const parsedFisheryIdString = Array.isArray(fisheryIdFromRoute)
    ? fisheryIdFromRoute[0]
    : fisheryIdFromRoute;
  const numericFisheryId = parsedFisheryIdString
    ? parseInt(parsedFisheryIdString, 10)
    : undefined;

  const [fisheryData, setFisheryData] = useState<FisheryRecord | null>(null);
  const [isLoadingFisheryData, setIsLoadingFisheryData] = useState(true);
  const [isFisheryFormOpen, setIsFisheryFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [lightHours, setLightHours] = useState<number | null>(null);
  const [rainfall, setRainfall] = useState<number | null>(null);
  const [surfacePressure, setSurfacePressure] = useState<number | null>(null);
  const [sensorUrl, setSensorUrl] = useState<string | null>(null);

  const [fisheryInventoryItems, setFisheryInventoryItems] = useState<
    ItemRecord[]
  >([]);
  const [loadingFisheryInventory, setLoadingFisheryInventory] = useState(true);
  const [fisheryInventoryError, setFisheryInventoryError] = useState<
    string | null
  >(null);

  const { temperatureScale } = useUserPreferences();

  const convertToFahrenheit = useCallback((celsius: number): number => {
    return Math.round(celsius * (9 / 5) + 32);
  }, []);

  const formatTemperature = useCallback(
    (celsiusValue: number | null, showUnit: boolean = true): string => {
      if (celsiusValue === null) return "N/A";
      let displayTemp = celsiusValue;
      let unit = "°C";
      if (temperatureScale === "Fahrenheit") {
        displayTemp = convertToFahrenheit(celsiusValue);
        unit = "°F";
      }
      const roundedTemp = Math.round(displayTemp);
      return showUnit ? `${roundedTemp}${unit}` : `${roundedTemp}°`;
    },
    [temperatureScale, convertToFahrenheit]
  );

  const fetchSpecificFisheryData = useCallback(async () => {
    if (!numericFisheryId) return;
    setIsLoadingFisheryData(true);
    setErrorMsg(null);
    try {
      const response = await axiosInstance.get<FisheryRecord>(
        `/fishery/${numericFisheryId}`
      );
      setFisheryData(response.data || null);
    } catch (err) {
      setFisheryData(null);
    } finally {
      setIsLoadingFisheryData(false);
    }
  }, [numericFisheryId]);

  useEffect(() => {
    if (router.isReady) {
      if (!numericFisheryId) {
        setIsLoadingFisheryData(false);
        setErrorMsg("Fishery ID not available or invalid.");
        setFisheryData(null);
        return;
      }
      fetchSpecificFisheryData();
    }
  }, [router.isReady, numericFisheryId, fetchSpecificFisheryData]);

  useEffect(() => {
    if (!parsedUserIdString) {
      setLoadingFisheryInventory(false);
      setFisheryInventoryItems([]);
      setFisheryInventoryError("User ID not specified for inventory check.");
      return;
    }

    const fetchFisheryInventoryForAlerts = async () => {
      setLoadingFisheryInventory(true);
      setFisheryInventoryError(null);
      try {
        const response = await axiosInstance.get(
          `/inventory/${parsedUserIdString}`,
          {
            params: { item_group: "Fishery" },
          }
        );
        setFisheryInventoryItems(response.data.items || []);
      } catch (err) {
        console.error(`Failed to fetch Fishery inventory:`, err);
        setFisheryInventoryError(
          `Failed to load fishery inventory data for alerts.`
        );
        setFisheryInventoryItems([]);
      } finally {
        setLoadingFisheryInventory(false);
      }
    };

    fetchFisheryInventoryForAlerts();
  }, [parsedUserIdString]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      const endpoint = sensorUrl || "/api/weather";
      try {
        const response = await axios.get(endpoint, {
          params: sensorUrl ? undefined : { lat, lon },
        });

        const newWeatherData: WeatherData = {
          temperature: Math.round(response.data.current.temperature2m),
          humidity: Math.round(response.data.current.relativeHumidity2m),
          lightHours:
            typeof response.data.daily.daylightDuration?.[0] === "number"
              ? response.data.daily.daylightDuration[0] / 3600
              : null,
          rainfall:
            typeof response.data.daily.precipitationSum?.[0] === "number"
              ? response.data.daily.precipitationSum[0]
              : null,
          surfacePressure:
            typeof response.data.current.surfacePressure === "number"
              ? response.data.current.surfacePressure
              : null,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          "weatherDataFishery",
          JSON.stringify(newWeatherData)
        );
        setTemperature(newWeatherData.temperature);
        setHumidity(newWeatherData.humidity);
        setLightHours(newWeatherData.lightHours);
        setRainfall(newWeatherData.rainfall);
        setSurfacePressure(newWeatherData.surfacePressure);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to fetch weather for Fishery", error.message);
        } else {
          console.error(
            "An unknown error occurred while fetching weather for Fishery"
          );
        }
      }
    };

    const getLocationAndFetch = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeather(latitude, longitude);
          },
          (error) => {
            console.error("Geolocation error:", error.message);
          },
          { enableHighAccuracy: true }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };

    const cached = localStorage.getItem("weatherDataFishery");
    if (cached) {
      const parsed: WeatherData = JSON.parse(cached);
      const isValid = Date.now() - parsed.timestamp < 5 * 60 * 1000;
      if (isValid) {
        setTemperature(parsed.temperature);
        setHumidity(parsed.humidity);
        setLightHours(parsed.lightHours);
        setRainfall(parsed.rainfall);
        setSurfacePressure(parsed.surfacePressure);
        return;
      }
    }
    getLocationAndFetch();
  }, [sensorUrl]);

  const pageTitle =
    fisheryData && fisheryData.fishery_type && fisheryData.target_species
      ? `${fisheryData.fishery_type}: ${fisheryData.target_species}`
      : "Fishery Details";

  const handleFisheryFormSuccess = () => {
    setIsFisheryFormOpen(false);
    fetchSpecificFisheryData();
  };

  const formattedDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPpp");
    } catch (e) {
      return "Invalid Date";
    }
  };

  return (
    <>
      <Head>
        <title>Graminate | {pageTitle}</title>
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4 sm:p-6">
          <AlertDisplay
            temperature={temperature}
            formatTemperature={formatTemperature}
            inventoryItems={fisheryInventoryItems}
            loadingInventory={loadingFisheryInventory}
            inventoryCategoryName="Fishery"
          />

          <div className="mb-6 mt-2 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                {isLoadingFisheryData ? (
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Loading Fishery Details...
                  </h1>
                ) : fisheryData ? (
                  <>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                      Fishery Management
                    </h1>
                  </>
                ) : (
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Fishery Details Not Found
                  </h1>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  arrow="left"
                  text="All Fisheries"
                  style="secondary"
                  onClick={() =>
                    router.push(`/platform/${parsedUserIdString}/fishery`)
                  }
                />
                {numericFisheryId && fisheryData && (
                  <Button
                    text="Edit Fishery"
                    style="secondary"
                    onClick={() => setIsFisheryFormOpen(true)}
                    isDisabled={isLoadingFisheryData}
                  />
                )}
              </div>
            </div>

            {!isLoadingFisheryData && fisheryData && (
              <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faWater}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Fishery Type</span>
                      {fisheryData.fishery_type}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faFishFins}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">
                        Target Species
                      </span>
                      {fisheryData.target_species}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faClipboardList}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Feed Type</span>
                      {fisheryData.feed_type}
                    </div>
                  </div>
                  {fisheryData.notes && (
                    <div className="flex items-center">
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="mr-3 w-4 h-4 text-gray-300"
                      />
                      <div>
                        <span className="font-semibold block">Notes</span>
                        {fisheryData.notes}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Created On</span>
                      {formattedDate(fisheryData.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isLoadingFisheryData ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : errorMsg ? (
            <div className="text-center py-10">
              <p className="text-red-500 text-lg">{errorMsg}</p>
            </div>
          ) : fisheryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <QualityCard />
                </div>
              </div>

              <div>
                {numericUserId && !isNaN(numericUserId) ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <TaskManager
                        userId={numericUserId}
                        projectType="Fishery"
                      />
                      <ConditionCard
                        temperature={temperature}
                        humidity={humidity}
                        lightHours={lightHours}
                        rainfall={rainfall}
                        surfacePressure={surfacePressure}
                        formatTemperature={formatTemperature}
                        onCustomUrlSubmit={(url) => setSensorUrl(url)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <InventoryStockCard
                        userId={parsedUserIdString}
                        title="Fishery Related Inventory"
                        category="Fishery"
                      />
                    </div>
                  </>
                ) : (
                  <p className="dark:text-gray-400">
                    User ID not available or invalid for tasks and stock view.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No fishery data to display.
              </p>
            </div>
          )}
        </main>
        {isFisheryFormOpen && fisheryData && (
          <FisheryForm
            onClose={() => setIsFisheryFormOpen(false)}
            formTitle="Edit Fishery Details"
            fisheryToEdit={fisheryData}
            onFisheryUpdateOrAdd={handleFisheryFormSuccess}
          />
        )}
      </PlatformLayout>
    </>
  );
};

export default FisheryDetail;
