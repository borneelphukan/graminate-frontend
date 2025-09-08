import { useEffect, useState, useCallback, useMemo } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaw,
  faListOl,
  faBullseye,
  faCalendarAlt,
  faThermometerHalf,
  faDroplet,
  faCloudRain,
  faWind,
  faSun,
} from "@fortawesome/free-solid-svg-icons";

import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";
import Button from "@/components/ui/Button";
import AlertDisplay from "@/components/ui/AlertDisplay";
import Loader from "@/components/ui/Loader";
import axios from "axios";
import CattleForm, { CattleRearingData } from "@/components/form/CattleForm";
import MilkCard from "@/components/cards/cattle_rearing/MilkCard";
import EnvironmentCard, { Metric } from "@/components/cards/EnvironmentCard";

type CattleRearingDetail = {
  cattle_id: number;
  user_id: number;
  cattle_name: string;
  cattle_type: string | null;
  number_of_animals: number;
  purpose: string | null;
  created_at: string;
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
  feed?: boolean;
};

type WeatherDataState = {
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
};

const mapSupportedLanguageToLocale = (lang: SupportedLanguage): string => {
  switch (lang) {
    case "English":
      return "en";
    case "Hindi":
      return "hi";
    case "Assamese":
      return "as";
    default:
      return "en";
  }
};

const CattleDetailPage = () => {
  const router = useRouter();
  const { user_id, id: cattleIdFromRoute } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const parsedCattleId = Array.isArray(cattleIdFromRoute)
    ? cattleIdFromRoute[0]
    : cattleIdFromRoute;

  const {
    temperatureScale,
    timeFormat,
    language: currentLanguage,
  } = useUserPreferences();

  const [selectedCattleData, setSelectedCattleData] =
    useState<CattleRearingDetail | null>(null);
  const [loadingCattleData, setLoadingCattleData] = useState(true);
  const [showCattleForm, setShowCattleForm] = useState(false);

  const [cattleInventoryItems, setCattleInventoryItems] = useState<
    ItemRecord[]
  >([]);
  const [loadingCattleInventory, setLoadingCattleInventory] = useState(true);

  const [weatherData, setWeatherData] = useState<WeatherDataState>({
    temperature: null,
    humidity: null,
    rainfall: null,
    windSpeed: null,
    uvIndex: null,
  });
  const [weatherLoading, setWeatherLoading] = useState(true);

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

  const fetchCattleDetails = useCallback(async () => {
    if (!parsedCattleId) return;
    setLoadingCattleData(true);
    try {
      const response = await axiosInstance.get<CattleRearingDetail>(
        `/cattle-rearing/${parsedCattleId}`
      );
      setSelectedCattleData(response.data);
    } catch (error) {
      console.error("Error fetching cattle details:", error);
      setSelectedCattleData(null);
    } finally {
      setLoadingCattleData(false);
    }
  }, [parsedCattleId]);

  useEffect(() => {
    if (parsedCattleId) {
      fetchCattleDetails();
    }
  }, [parsedCattleId, fetchCattleDetails]);

  const formattedDateOverview = (
    dateString: string | undefined | null,
    includeTime: boolean = true
  ) => {
    if (!dateString) return "N/A";
    const locale = mapSupportedLanguageToLocale(currentLanguage);
    const dateTimeOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      ...(includeTime && {
        hour: "numeric",
        minute: "numeric",
        hour12: timeFormat === "12-hour",
      }),
    };
    return new Date(dateString).toLocaleString(locale, dateTimeOptions);
  };

  useEffect(() => {
    if (!parsedUserId) {
      setLoadingCattleInventory(false);
      setCattleInventoryItems([]);
      return;
    }
    const fetchCattleInventory = async () => {
      setLoadingCattleInventory(true);
      const response = await axiosInstance.get(`/inventory/${parsedUserId}`, {
        params: { item_group: "Cattle Rearing" },
      });
      setCattleInventoryItems(response.data.items || []);
    };
    fetchCattleInventory();
  }, [parsedUserId]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      setWeatherLoading(true);
      try {
        const response = await axios.get("/api/weather", {
          params: { lat, lon },
        });
        const { current, daily } = response.data;
        const newWeatherData = {
          temperature: current.temperature2m,
          humidity: current.relativeHumidity2m,
          rainfall: current.rain,
          windSpeed: current.windSpeed10m,
          uvIndex: daily.uvIndexMax?.[0],
          timestamp: Date.now(),
        };
        localStorage.setItem(
          "weatherDataCattle",
          JSON.stringify(newWeatherData)
        );
        setWeatherData(newWeatherData);
      } catch (error: unknown) {
        console.error("Failed to fetch weather data", error);
      } finally {
        setWeatherLoading(false);
      }
    };

    const getLocationAndFetch = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            fetchWeather(position.coords.latitude, position.coords.longitude),
          () => console.error("Geolocation permission denied or error."),
          { enableHighAccuracy: true }
        );
      }
    };

    const cached = localStorage.getItem("weatherDataCattle");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
        setWeatherData(parsed);
        setWeatherLoading(false);
        return;
      }
    }
    getLocationAndFetch();
  }, []);

  const detailItems = useMemo(() => {
    if (!selectedCattleData) return [];
    return [
      {
        label: "Cattle Type",
        value: selectedCattleData.cattle_type || "N/A",
        icon: faPaw,
      },
      {
        label: "Number of Animals",
        value: String(selectedCattleData.number_of_animals),
        icon: faListOl,
      },
      {
        label: "Purpose",
        value: selectedCattleData.purpose || "N/A",
        icon: faBullseye,
      },
      {
        label: "Herd Created On",
        value: formattedDateOverview(selectedCattleData.created_at),
        icon: faCalendarAlt,
      },
    ];
  }, [selectedCattleData, formattedDateOverview]);

  const displayValue = (
    value: number | null | undefined,
    unit: string = "",
    toFixedPlaces?: number
  ): string => {
    if (value === null || value === undefined) return "N/A";
    const numericValue =
      typeof toFixedPlaces === "number"
        ? value.toFixed(toFixedPlaces)
        : Math.round(value);
    return `${numericValue}${unit}`;
  };

  const environmentMetrics: Metric[] = useMemo(
    () => [
      {
        icon: faThermometerHalf,
        label: "Temperature",
        value: formatTemperature(weatherData.temperature),
      },
      {
        icon: faDroplet,
        label: "Humidity",
        value: displayValue(weatherData.humidity, "%"),
      },
      {
        icon: faCloudRain,
        label: "Rainfall",
        value: displayValue(weatherData.rainfall, " mm"),
      },
      {
        icon: faWind,
        label: "Wind Speed",
        value: displayValue(weatherData.windSpeed, " km/h", 1),
      },
      {
        icon: faSun,
        label: "UV Index",
        value: displayValue(weatherData.uvIndex, "", 1),
      },
    ],
    [weatherData, formatTemperature]
  );

  return (
    <PlatformLayout>
      <Head>
        <title>
          Graminate |{" "}
          {selectedCattleData
            ? selectedCattleData.cattle_name
            : "Cattle Details"}
        </title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <AlertDisplay
          temperature={weatherData.temperature}
          formatTemperature={formatTemperature}
          inventoryItems={cattleInventoryItems}
          loadingInventory={loadingCattleInventory}
          inventoryCategoryName="Cattle Rearing"
          latestFutureAppointment={null}
        />

        <div className="mb-6 mt-2 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              {loadingCattleData ? (
                <Loader />
              ) : selectedCattleData ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Cattle Management
                  </h1>
                  <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
                    <span className="font-semibold">Herd Name:</span>{" "}
                    {selectedCattleData.cattle_name}
                  </h2>
                </>
              ) : (
                <h1 className="text-2xl font-bold text-red-200">
                  Cattle Details Not Available
                </h1>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedUserId && (
                <Button
                  text="All Cattle Records"
                  arrow="left"
                  style="secondary"
                  onClick={() =>
                    router.push(`/platform/${parsedUserId}/cattle_rearing`)
                  }
                />
              )}

              {selectedCattleData && !loadingCattleData && (
                <Button
                  text="Edit Record"
                  style="secondary"
                  onClick={() => setShowCattleForm(true)}
                />
              )}
            </div>
          </div>

          {loadingCattleData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <Loader />
            </div>
          ) : selectedCattleData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {detailItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start p-2 rounded"
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className="mr-3 mt-1 w-4 h-4 text-blue-200 flex-shrink-0"
                    />
                    <div>
                      <span className="font-semibold block text-gray-700 dark:text-gray-300">
                        {item.label}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <p className="text-gray-500 dark:text-gray-400">
                Cattle data could not be loaded.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <MilkCard userId={parsedUserId} cattleId={parsedCattleId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <EnvironmentCard
              title="Environmental Conditions"
              loading={weatherLoading}
              metrics={environmentMetrics}
              gridConfig="grid-cols-2 md:grid-cols-3 gap-4"
            />
          </div>
        </div>
      </div>
      {showCattleForm && selectedCattleData && (
        <CattleForm
          onClose={() => setShowCattleForm(false)}
          formTitle="Edit Cattle Record Details"
          cattleToEdit={selectedCattleData as CattleRearingData}
          onCattleUpdateOrAdd={() => {
            setShowCattleForm(false);
            fetchCattleDetails();
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default CattleDetailPage;
