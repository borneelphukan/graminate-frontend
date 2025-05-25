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
  PointElement,
  LineElement,
  ChartData,
  Filler,
} from "chart.js";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDrumstickBite,
  faKiwiBird,
  faCalendarAlt,
  faWarehouse,
  faBuilding,
  faStickyNote,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";

import EnvironmentCard from "@/components/cards/poultry/EnvironmentCard";
import VeterinaryCard from "@/components/cards/poultry/VeterinaryCard";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import TaskManager from "@/components/cards/TaskManager";
import InventoryStockCard from "@/components/cards/InventoryStock";
import Button from "@/components/ui/Button";
import FlockForm from "@/components/form/FlockForm";
import AlertDisplay from "@/components/ui/AlertDisplay";
import Loader from "@/components/ui/Loader";
import PoultryEggCard from "@/components/cards/poultry/PoultryEggCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
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
  const [flockAge, setFlockAge] = useState<string>("Calculating...");

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

  const [poultryEggCardStats, setPoultryEggCardStats] = useState<{
    brokenEggsPercentage: number;
    averageEggWeight: string;
    totalEggsCollected: number;
    eggCollectionLineData: ChartData<"line">;
    loading: boolean;
  }>({
    brokenEggsPercentage: 0,
    averageEggWeight: "N/A",
    totalEggsCollected: 0,
    eggCollectionLineData: {
      labels: [],
      datasets: [
        {
          label: "Eggs Collected",
          data: [],
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
          tension: 0.1,
        },
      ],
    },
    loading: true,
  });

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

  useEffect(() => {
    if (selectedFlockData && selectedFlockData.created_at) {
      const dateCreated = selectedFlockData.created_at;
      try {
        const createdDate = new Date(dateCreated);
        if (isNaN(createdDate.getTime())) {
          setFlockAge("Invalid Date");
          return;
        }

        const currentDate = new Date();
        let years = currentDate.getFullYear() - createdDate.getFullYear();
        let months = currentDate.getMonth() - createdDate.getMonth();
        let days = currentDate.getDate() - createdDate.getDate();

        if (days < 0) {
          months--;
          const lastMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
          );
          days += lastMonth.getDate();
        }

        if (months < 0) {
          years--;
          months += 12;
        }

        let ageString = "";
        if (years > 0) {
          ageString += `${years} year${years > 1 ? "s" : ""}`;
        }
        if (months > 0) {
          if (ageString) ageString += ", ";
          ageString += `${months} month${months > 1 ? "s" : ""}`;
        }
        if (days > 0 || (years === 0 && months === 0)) {
          if (ageString && !(years === 0 && months === 0 && days > 0))
            ageString += ", ";
          if (years === 0 && months === 0 && days === 0) {
            ageString = "Stocked Today";
          } else if (years === 0 && months === 0 && days > 0) {
            ageString = `${days} day${days > 1 ? "s" : ""}`;
          } else if (ageString || days > 0) {
            if (ageString && days > 0) ageString += ", ";
            if (days > 0) ageString += `${days} day${days > 1 ? "s" : ""}`;
          }
        }

        if (!ageString && days === 0 && months === 0 && years === 0) {
          ageString = "0 days";
        }
        setFlockAge(ageString || "N/A");
      } catch (error) {
        console.error("Error calculating flock age:", error);
        setFlockAge("Error");
      }
    } else {
      setFlockAge(selectedFlockData ? "N/A" : "Calculating...");
    }
  }, [selectedFlockData]);

  const formattedDateOverview = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPpp");
    } catch (e) {
      console.error("Error formatting date for overview:", e);
      return "Invalid Date";
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const totalCollectedOverall = 1575;
      const brokenOverall = 63;
      const brokenPercentage =
        totalCollectedOverall > 0
          ? (brokenOverall / totalCollectedOverall) * 100
          : 0;

      const today = new Date();
      const lineLabels: string[] = [];
      const dailyEggData: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        lineLabels.push(
          d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        );
        dailyEggData.push(Math.floor(Math.random() * 50) + 200);
      }

      setPoultryEggCardStats({
        brokenEggsPercentage: brokenPercentage,
        averageEggWeight: "Medium",
        totalEggsCollected: totalCollectedOverall,
        eggCollectionLineData: {
          labels: lineLabels,
          datasets: [
            {
              label: "Daily Eggs Collected",
              data: dailyEggData,
              borderColor: "rgb(54, 162, 235)",
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              fill: true,
              tension: 0.2,
              pointBackgroundColor: "rgb(54, 162, 235)",
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: "rgb(54, 162, 235)",
            },
          ],
        },
        loading: false,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedFlockData]);

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

  const handleLogEggCollection = () => {
    if (parsedUserId && parsedFlockId) {
      router.push(
        `/platform/${parsedUserId}/poultry/poultry-eggs?flock_id=${parsedFlockId}`
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

        <div className="mb-6 mt-2 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              {loadingFlockData ? (
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Loading Flock Details...
                </h1>
              ) : selectedFlockData ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Poultry Management
                  </h1>
                  <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
                    <span className="font-semibold">Flock Name:</span>{" "}
                    {selectedFlockData.flock_name}
                  </h2>
                </>
              ) : (
                <h1 className="text-2xl font-bold text-red-500 dark:text-red-400">
                  Flock Details Not Available
                </h1>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedUserId && (
                <Button
                  text="All Flocks"
                  arrow="left"
                  style="secondary"
                  onClick={() =>
                    router.push(`/platform/${parsedUserId}/poultry`)
                  }
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

          {loadingFlockData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <Loader />
            </div>
          ) : selectedFlockData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faDrumstickBite}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Total Birds</span>
                    {selectedFlockData.quantity !== undefined &&
                    selectedFlockData.quantity !== null
                      ? selectedFlockData.quantity.toLocaleString()
                      : "N/A"}
                  </div>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faDrumstickBite}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Flock Type</span>
                    {selectedFlockData.flock_type || "N/A"}
                  </div>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Flock Age</span>
                    {flockAge}
                  </div>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faKiwiBird}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Breed</span>
                    {selectedFlockData.breed || "N/A"}
                  </div>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faWarehouse}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Housing Type</span>
                    {selectedFlockData.housing_type || "N/A"}
                  </div>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faBuilding}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Source</span>
                    {selectedFlockData.source || "N/A"}
                  </div>
                </div>
                {selectedFlockData.notes && (
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faStickyNote}
                      className="mr-3 w-4 h-4 text-gray-300"
                    />
                    <div>
                      <span className="font-semibold block">Notes</span>
                      {selectedFlockData.notes}
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
                    {formattedDateOverview(selectedFlockData.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <p className="text-gray-500 dark:text-gray-400">
                Flock data could not be loaded or is not available.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <InventoryStockCard
            userId={parsedUserId}
            title="Poultry Inventory"
            category="Poultry"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TaskManager userId={Number(parsedUserId)} projectType="Poultry" />
          <PoultryEggCard
            brokenEggsPercentage={poultryEggCardStats.brokenEggsPercentage}
            averageEggWeight={poultryEggCardStats.averageEggWeight}
            totalEggsCollected={poultryEggCardStats.totalEggsCollected}
            onLogEggCollection={handleLogEggCollection}
            eggCollectionLineData={poultryEggCardStats.eggCollectionLineData}
            onManageClick={handleLogEggCollection}
            loading={poultryEggCardStats.loading}
          />
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
