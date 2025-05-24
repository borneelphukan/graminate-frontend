import { useEffect, useState, useCallback } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { useRouter } from "next/router";
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

import EnvironmentCard from "@/components/cards/poultry/EnvironmentCard";
import PoultryOverviewCard from "@/components/cards/poultry/PoultryOverviewCard";
import VeterinaryCard from "@/components/cards/poultry/VeterinaryCard";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import TaskManager from "@/components/cards/TaskManager";
import InventoryStockCard from "@/components/cards/InventoryStock";
import Button from "@/components/ui/Button";
import FlockForm from "@/components/form/FlockForm";
import AlertDisplay from "@/components/ui/AlertDisplay";
import Loader from "@/components/ui/Loader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type FlockData = {
  flock_id: number;
  user_id: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};

interface PoultryHealthRecord {
  poultry_health_id: number;
  user_id: number;
  flock_id: number;
  veterinary_name?: string;
  total_birds: number;
  birds_vaccinated: number;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
  created_at: string;
}

interface LatestPoultryHealthData {
  birds_vaccinated: number | null;
  total_birds_at_event: number | null;
  latest_future_appointment: string | null;
  loading: boolean;
  error: string | null;
}

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

const Poultry = () => {
  const router = useRouter();
  const { user_id, id: flockIdFromRoute } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const parsedFlockId = Array.isArray(flockIdFromRoute)
    ? flockIdFromRoute[0]
    : flockIdFromRoute;

  const [selectedFlockData, setSelectedFlockData] = useState<FlockData | null>(
    null
  );
  const [loadingFlockData, setLoadingFlockData] = useState(true);
  const [showFlockForm, setShowFlockForm] = useState(false);

  const [latestPoultryHealthData, setLatestPoultryHealthData] =
    useState<LatestPoultryHealthData>({
      birds_vaccinated: null,
      total_birds_at_event: null,
      latest_future_appointment: null,
      loading: true,
      error: null,
    });

  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [lightHours, setLightHours] = useState<number | null>(null);

  const [poultryInventoryItems, setPoultryInventoryItems] = useState<
    ItemRecord[]
  >([]);
  const [loadingPoultryInventory, setLoadingPoultryInventory] = useState(true);

  const [sensorUrl, setSensorUrl] = useState<string | null>(null);

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

  const fetchFlockData = useCallback(async () => {
    if (!parsedFlockId) return;
    setLoadingFlockData(true);
    try {
      const response = await axiosInstance.get<FlockData>(
        `/flock/${parsedFlockId}`
      );
      setSelectedFlockData(response.data);
    } catch (error) {
      console.error("Error fetching flock data:", error);
      setSelectedFlockData(null);
    } finally {
      setLoadingFlockData(false);
    }
  }, [parsedFlockId]);

  useEffect(() => {
    if (parsedFlockId) {
      fetchFlockData();
    }
  }, [parsedFlockId, fetchFlockData]);

  const fetchHealthDataForFlock = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) return;

    setLatestPoultryHealthData((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await axiosInstance.get<{
        records: PoultryHealthRecord[];
      }>(`/poultry-health/${parsedUserId}?flockId=${parsedFlockId}`);
      let latestVaccinatedBirds: number | null = null;
      let totalBirdsAtLatestVaccinationEvent: number | null = null;
      let latestFutureAppointment: string | null = null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (response.data.records && response.data.records.length > 0) {
        const sortedRecordsByCreation = [...response.data.records].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        if (sortedRecordsByCreation.length > 0) {
          latestVaccinatedBirds = sortedRecordsByCreation[0].birds_vaccinated;
          totalBirdsAtLatestVaccinationEvent =
            sortedRecordsByCreation[0].total_birds;
        }

        const futureAppointments = response.data.records
          .filter(
            (record) =>
              record.next_appointment &&
              new Date(record.next_appointment) >= today
          )
          .sort(
            (a, b) =>
              new Date(a.next_appointment!).getTime() -
              new Date(b.next_appointment!).getTime()
          );

        if (futureAppointments.length > 0) {
          latestFutureAppointment = futureAppointments[0].next_appointment!;
        }
      }

      setLatestPoultryHealthData({
        birds_vaccinated: latestVaccinatedBirds,
        total_birds_at_event: totalBirdsAtLatestVaccinationEvent,
        latest_future_appointment: latestFutureAppointment,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching poultry health data:", error);
      setLatestPoultryHealthData({
        birds_vaccinated: null,
        total_birds_at_event: null,
        latest_future_appointment: null,
        loading: false,
        error: "Failed to fetch health data.",
      });
    }
  }, [parsedUserId, parsedFlockId]);

  useEffect(() => {
    fetchHealthDataForFlock();
  }, [fetchHealthDataForFlock]);

  useEffect(() => {
    if (!parsedUserId) {
      setLoadingPoultryInventory(false);
      setPoultryInventoryItems([]);

      return;
    }

    const fetchPoultryInventory = async () => {
      setLoadingPoultryInventory(true);

      try {
        const response = await axiosInstance.get(`/inventory/${parsedUserId}`, {
          params: { item_group: "Poultry" },
        });
        setPoultryInventoryItems(response.data.items || []);
      } catch (err) {
        console.error(`Failed to fetch Poultry inventory:`, err);

        setPoultryInventoryItems([]);
      } finally {
        setLoadingPoultryInventory(false);
      }
    };

    fetchPoultryInventory();
  }, [parsedUserId]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      const endpoint = sensorUrl || "/api/weather";
      try {
        const response = await axios.get(endpoint, {
          params: sensorUrl ? undefined : { lat, lon },
        });
        const newWeatherData = {
          temperature: Math.round(response.data.current.temperature2m),
          humidity: Math.round(response.data.current.relativeHumidity2m),
          lightHours:
            typeof response.data.daily.daylightDuration?.[0] === "number"
              ? response.data.daily.daylightDuration[0] / 3600
              : null,
          timestamp: Date.now(),
        };
        localStorage.setItem("weatherData", JSON.stringify(newWeatherData));
        setTemperature(newWeatherData.temperature);
        setHumidity(newWeatherData.humidity);
        setLightHours(newWeatherData.lightHours);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to fetch weather", error.message);
        } else {
          console.error("An unknown error occurred while fetching weather");
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

    const cached = localStorage.getItem("weatherData");
    if (cached) {
      const parsed = JSON.parse(cached);
      const isValid = Date.now() - parsed.timestamp < 2 * 60 * 1000;
      if (isValid) {
        setTemperature(parsed.temperature);
        setHumidity(parsed.humidity);
        setLightHours(parsed.lightHours);
        return;
      }
    }
    getLocationAndFetch();
  }, [sensorUrl]);

  const handleManageHealthRecordsClick = () => {
    if (parsedUserId && parsedFlockId) {
      router.push(
        `/platform/${parsedUserId}/poultry/poultry-health?flock_id=${parsedFlockId}`
      );
    } else {
      console.error("User ID or Flock ID is missing, cannot navigate.");
    }
  };

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Poultry Management</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <AlertDisplay
          temperature={temperature}
          formatTemperature={formatTemperature}
          inventoryItems={poultryInventoryItems}
          loadingInventory={loadingPoultryInventory}
          inventoryCategoryName="Poultry"
          latestFutureAppointment={
            latestPoultryHealthData.latest_future_appointment
          }
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center dark:bg-dark relative mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
              Poultry Management
            </h1>
            <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
              <span className="font-semibold">Flock Name:</span>{" "}
              {selectedFlockData?.flock_name}
            </h2>
          </div>
          <div className="flex gap-3 mt-3 sm:mt-0">
            {parsedUserId && (
              <Button
                text="All Flocks"
                arrow="left"
                style="secondary"
                onClick={() => router.push(`/platform/${parsedUserId}/poultry`)}
              />
            )}
            {selectedFlockData && !loadingFlockData && (
              <Button
                text="Edit Flock Details"
                style="secondary"
                onClick={() => setShowFlockForm(true)}
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingFlockData ? (
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex justify-center items-center h-full">
              <p>Loading flock data...</p>
            </div>
          ) : selectedFlockData ? (
            <PoultryOverviewCard
              quantity={selectedFlockData.quantity}
              flockId={selectedFlockData.flock_id}
              flockType={selectedFlockData.flock_type}
              dateCreated={selectedFlockData.created_at}
              breed={selectedFlockData.breed}
              source={selectedFlockData.source}
              housingType={selectedFlockData.housing_type}
              notes={selectedFlockData.notes}
            />
          ) : (
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex justify-center items-center h-full">
              <Loader />
            </div>
          )}

          <VeterinaryCard
            birdsVaccinated={latestPoultryHealthData.birds_vaccinated}
            totalBirdsInvolvedInRecord={
              latestPoultryHealthData.total_birds_at_event
            }
            nextAppointmentDate={
              latestPoultryHealthData.latest_future_appointment
            }
            onManageClick={handleManageHealthRecordsClick}
            loading={latestPoultryHealthData.loading}
          />

          <EnvironmentCard
            temperature={temperature}
            humidity={humidity}
            lightHours={lightHours}
            formatTemperature={formatTemperature}
            onCustomUrlSubmit={(url) => setSensorUrl(url)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InventoryStockCard
            userId={parsedUserId}
            title="Poultry Inventory"
            category="Poultry"
          />
          <TaskManager userId={Number(parsedUserId)} projectType="Poultry" />
        </div>
      </div>
      {showFlockForm && selectedFlockData && (
        <FlockForm
          onClose={() => setShowFlockForm(false)}
          formTitle="Edit Flock Details"
          flockToEdit={selectedFlockData}
        />
      )}
    </PlatformLayout>
  );
};

export default Poultry;
