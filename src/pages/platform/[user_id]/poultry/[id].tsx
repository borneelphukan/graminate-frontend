import { useEffect, useState, useCallback, useMemo } from "react";
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
  ChartDataset,
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
import {
  format as formatDateFns,
  parseISO,
  startOfDay,
  compareDesc,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isBefore,
  min as minDateFn,
  subDays,
  differenceInDays,
} from "date-fns";

import EnvironmentCard from "@/components/cards/poultry/EnvironmentCard";
import VeterinaryCard from "@/components/cards/poultry/VeterinaryCard";
import PoultryFeedCard from "@/components/cards/poultry/PoultryFeedCard";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";
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

type PoultryHealthRecord = {
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
};

type PoultryEggRecordFromApi = {
  egg_id: number;
  user_id: number;
  flock_id: number;
  date_collected: string;
  small_eggs: number;
  medium_eggs: number;
  large_eggs: number;
  extra_large_eggs: number;
  total_eggs: number;
  broken_eggs: number;
  date_logged: string;
};

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
  feed?: boolean;
};

interface LatestEggMetrics {
  totalEggs: number;
  brokenEggs: number;
  brokenPercentage: number;
  smallEggs: number;
  mediumEggs: number;
  largeEggs: number;
  extraLargeEggs: number;
}

interface PoultryFeedRecord {
  feed_id: number;
  user_id: number;
  flock_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
  created_at: string;
}

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

const PoultryDetail = () => {
  const router = useRouter();
  const { user_id, id: flockIdFromRoute } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const parsedFlockId = Array.isArray(flockIdFromRoute)
    ? flockIdFromRoute[0]
    : flockIdFromRoute;

  const {
    temperatureScale,
    timeFormat,
    language: currentLanguage,
  } = useUserPreferences();

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

  const [allEggRecords, setAllEggRecords] = useState<PoultryEggRecordFromApi[]>(
    []
  );
  const [earliestEggDataDate, setEarliestEggDataDate] = useState<Date | null>(
    null
  );

  const [poultryEggCardStats, setPoultryEggCardStats] = useState<{
    latestMetrics: LatestEggMetrics | null;
    eggCollectionLineData: ChartData<"line">;
    loading: boolean;
    error: string | null;
  }>({
    latestMetrics: null,
    eggCollectionLineData: {
      labels: [],
      datasets: [],
    },
    loading: true,
    error: null,
  });

  const [allFeedRecords, setAllFeedRecords] = useState<PoultryFeedRecord[]>([]);
  const [loadingAllFeedRecords, setLoadingAllFeedRecords] = useState(true);
  const [feedInventoryDays, setFeedInventoryDays] = useState<number>(0);
  const [avgDailyConsumptionKg, setAvgDailyConsumptionKg] = useState<number>(0);
  const [avgDailyConsumptionDisplay, setAvgDailyConsumptionDisplay] =
    useState<string>("N/A");
  const [timesFedToday, setTimesFedToday] = useState<number>(0);
  const [targetFeedingsPerDay] = useState<number>(7);
  const [loadingCalculatedFeedData, setLoadingCalculatedFeedData] =
    useState(true);

  const getFeedLevelColor = useCallback((days: number): string => {
    if (!isFinite(days) || days < 0) return "text-gray-200";
    if (days < 3) return "text-red-200";
    if (days < 7) return "text-yellow-200";
    return "text-green-200";
  }, []);

  const convertAmountToKg = (amount: number, unit: string): number => {
    const unitLower = unit ? unit.toLowerCase() : "";
    if (unitLower === "kg") return amount;
    if (unitLower === "g" || unitLower === "grams") return amount / 1000;
    if (unitLower === "lbs" || unitLower === "pounds") return amount * 0.453592;
    if (unitLower && unitLower !== "") {
    }
    return 0;
  };

  const fetchAllPoultryFeedData = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) {
      setLoadingAllFeedRecords(false);
      return;
    }
    setLoadingAllFeedRecords(true);
    try {
      const response = await axiosInstance.get<{
        records: PoultryFeedRecord[];
      }>(`/poultry-feeds/${parsedUserId}?flockId=${parsedFlockId}&limit=10000`);
      setAllFeedRecords(response.data.records || []);
    } catch (error) {
      setAllFeedRecords([]);
    } finally {
      setLoadingAllFeedRecords(false);
    }
  }, [parsedUserId, parsedFlockId]);

  useEffect(() => {
    fetchAllPoultryFeedData();
  }, [fetchAllPoultryFeedData]);

  useEffect(() => {
    if (loadingAllFeedRecords) {
      setLoadingCalculatedFeedData(true);
      return;
    }
    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(today, 29));
    let totalKgConsumedLast30Days = 0;
    const recordsInLast30Days = allFeedRecords.filter((record) => {
      const recordDate = startOfDay(parseISO(record.feed_date));
      return recordDate >= thirtyDaysAgo && recordDate <= today;
    });
    recordsInLast30Days.forEach((record) => {
      totalKgConsumedLast30Days += convertAmountToKg(
        record.amount_given,
        record.units
      );
    });
    const earliestRecordDateInPeriod =
      recordsInLast30Days.length > 0
        ? minDateFn(recordsInLast30Days.map((r) => parseISO(r.feed_date)))
        : thirtyDaysAgo;
    const daysInPeriodWithData = Math.max(
      1,
      differenceInDays(today, earliestRecordDateInPeriod) + 1
    );
    const calculatedAvgDailyKg =
      recordsInLast30Days.length > 0
        ? totalKgConsumedLast30Days / Math.min(30, daysInPeriodWithData)
        : 0;
    setAvgDailyConsumptionKg(calculatedAvgDailyKg);
    const fedTodayCount = allFeedRecords.filter(
      (record) =>
        startOfDay(parseISO(record.feed_date)).getTime() === today.getTime()
    ).length;
    setTimesFedToday(fedTodayCount);
    setLoadingCalculatedFeedData(false);
  }, [allFeedRecords, loadingAllFeedRecords]);

  useEffect(() => {
    if (
      loadingFlockData ||
      loadingPoultryInventory ||
      loadingCalculatedFeedData
    ) {
      return;
    }
    const actualFeedItems = poultryInventoryItems.filter(
      (item) => item.feed === true && item.item_group === "Poultry"
    );

    const totalFeedQuantityKgForConsumption = actualFeedItems.reduce(
      (sum, item) => sum + convertAmountToKg(item.quantity, item.units),
      0
    );
    if (avgDailyConsumptionKg > 0 && isFinite(avgDailyConsumptionKg)) {
      const days = totalFeedQuantityKgForConsumption / avgDailyConsumptionKg;
      setFeedInventoryDays(days);
    } else {
      setFeedInventoryDays(
        totalFeedQuantityKgForConsumption > 0 ? Infinity : 0
      );
    }
  }, [
    selectedFlockData,
    poultryInventoryItems,
    loadingFlockData,
    loadingPoultryInventory,
    avgDailyConsumptionKg,
    loadingCalculatedFeedData,
  ]);

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
        setFlockAge("Error");
      }
    } else {
      setFlockAge(selectedFlockData ? "N/A" : "Calculating...");
    }
  }, [selectedFlockData]);

  const formattedDateOverview = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const locale = mapSupportedLanguageToLocale(currentLanguage);
      const dateTimeOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: timeFormat === "12-hour",
      };
      return new Date(dateString).toLocaleString(locale, dateTimeOptions);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const processEggDataForGraph = useCallback(
    (
      recordsToProcess: PoultryEggRecordFromApi[],
      startDate: Date,
      endDate: Date
    ) => {
      if (!recordsToProcess) {
        setPoultryEggCardStats((prev) => ({
          ...prev,
          loading: false,
          eggCollectionLineData: { labels: [], datasets: [] },
          latestMetrics: null,
        }));
        return;
      }
      let latestMetricsData: LatestEggMetrics | null = null;
      if (recordsToProcess.length > 0) {
        const sortedByDateLogged = [...recordsToProcess].sort((a, b) =>
          compareDesc(parseISO(a.date_logged), parseISO(b.date_logged))
        );
        const latestRecord = sortedByDateLogged[0];
        if (latestRecord) {
          latestMetricsData = {
            totalEggs: latestRecord.total_eggs || 0,
            brokenEggs: latestRecord.broken_eggs || 0,
            brokenPercentage:
              (latestRecord.total_eggs || 0) > 0
                ? ((latestRecord.broken_eggs || 0) /
                    (latestRecord.total_eggs || 1)) *
                  100
                : 0,
            smallEggs: latestRecord.small_eggs || 0,
            mediumEggs: latestRecord.medium_eggs || 0,
            largeEggs: latestRecord.large_eggs || 0,
            extraLargeEggs: latestRecord.extra_large_eggs || 0,
          };
        }
      }

      const dailyAggregatedData: {
        [date: string]: {
          small_eggs: number;
          medium_eggs: number;
          large_eggs: number;
          extra_large_eggs: number;
          total_eggs: number;
        };
      } = {};

      const filteredRecords = recordsToProcess.filter((record) => {
        const recordDate = startOfDay(parseISO(record.date_collected));
        return (
          recordDate >= startOfDay(startDate) &&
          recordDate <= startOfDay(endDate)
        );
      });

      filteredRecords.forEach((record) => {
        const dateKey = formatDateFns(
          startOfDay(parseISO(record.date_collected)),
          "yyyy-MM-dd"
        );

        if (!dailyAggregatedData[dateKey]) {
          dailyAggregatedData[dateKey] = {
            small_eggs: 0,
            medium_eggs: 0,
            large_eggs: 0,
            extra_large_eggs: 0,
            total_eggs: 0,
          };
        }
        dailyAggregatedData[dateKey].small_eggs += record.small_eggs || 0;
        dailyAggregatedData[dateKey].medium_eggs += record.medium_eggs || 0;
        dailyAggregatedData[dateKey].large_eggs += record.large_eggs || 0;
        dailyAggregatedData[dateKey].extra_large_eggs +=
          record.extra_large_eggs || 0;
        dailyAggregatedData[dateKey].total_eggs += record.total_eggs || 0;
      });

      const dateRangeForLabels = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });
      const lineLabels = dateRangeForLabels.map((date) =>
        formatDateFns(date, "MMM d")
      );

      const datasets: ChartDataset<"line", number[]>[] = [];
      const eggTypes: (keyof (typeof dailyAggregatedData)[string])[] = [
        "small_eggs",
        "medium_eggs",
        "large_eggs",
        "extra_large_eggs",
        "total_eggs",
      ];
      const colors = [
        "rgb(255, 99, 132)",
        "rgb(54, 162, 235)",
        "rgb(255, 206, 86)",
        "rgb(75, 192, 192)",
        "rgb(153, 102, 255)",
      ];
      const backgroundColors = [
        "rgba(255, 99, 132, 0.2)",
        "rgba(54, 162, 235, 0.2)",
        "rgba(255, 206, 86, 0.2)",
        "rgba(75, 192, 192, 0.2)",
        "rgba(153, 102, 255, 0.2)",
      ];

      eggTypes.forEach((type, index) => {
        const dataPoints = dateRangeForLabels.map((date) => {
          const dateKey = formatDateFns(date, "yyyy-MM-dd");
          return dailyAggregatedData[dateKey]?.[type] || 0;
        });

        let label = type
          .replace("_eggs", "")
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        if (type === "total_eggs") label = "Total Collected";

        datasets.push({
          label: label,
          data: dataPoints,
          borderColor: colors[index % colors.length],
          backgroundColor: backgroundColors[index % backgroundColors.length],
          fill: type === "total_eggs" ? true : false,
          tension: 0.2,
          pointBackgroundColor: colors[index % colors.length],
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: colors[index % colors.length],
        });
      });

      setPoultryEggCardStats({
        latestMetrics: latestMetricsData,
        eggCollectionLineData: { labels: lineLabels, datasets: datasets },
        loading: false,
        error: null,
      });
    },
    []
  );

  const fetchAllPoultryEggData = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) return;
    setPoultryEggCardStats((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axiosInstance.get<{
        records: PoultryEggRecordFromApi[];
      }>(`/poultry-eggs/${parsedUserId}?flockId=${parsedFlockId}&limit=10000`);
      const fetchedRecords = response.data.records || [];
      setAllEggRecords(fetchedRecords);

      if (fetchedRecords.length > 0) {
        const dates = fetchedRecords.map((r) => parseISO(r.date_collected));
        const earliest = minDateFn(dates);
        setEarliestEggDataDate(startOfDay(earliest));
      } else {
        setEarliestEggDataDate(null);
      }

      const today = new Date();
      const initialStartDate = startOfWeek(today, { weekStartsOn: 1 });
      const initialEndDate = endOfWeek(today, { weekStartsOn: 1 });
      processEggDataForGraph(fetchedRecords, initialStartDate, initialEndDate);
    } catch (error) {
      setPoultryEggCardStats((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch egg collection data.",
        latestMetrics: null,
        eggCollectionLineData: { labels: [], datasets: [] },
      }));
    }
  }, [parsedUserId, parsedFlockId, processEggDataForGraph]);

  useEffect(() => {
    fetchAllPoultryEggData();
  }, [fetchAllPoultryEggData]);

  const handleGraphPeriodChange = useCallback(
    (startDate: Date, endDate: Date) => {
      processEggDataForGraph(allEggRecords, startDate, endDate);
    },
    [allEggRecords, processEggDataForGraph]
  );

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
        } else {
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
          (error) => {},
          { enableHighAccuracy: true }
        );
      } else {
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
    }
  };

  const handleLogEggCollection = () => {
    if (parsedUserId && parsedFlockId) {
      router.push(
        `/platform/${parsedUserId}/poultry/poultry-eggs?flock_id=${parsedFlockId}`
      );
    } else {
    }
  };

  const handleManageFeedRecordsClick = () => {
    if (parsedUserId && parsedFlockId) {
      router.push(
        `/platform/${parsedUserId}/poultry/poultry-feeds?flock_id=${parsedFlockId}`
      );
    } else {
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
                <h1 className="text-2xl font-bold text-red-200">
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
              {selectedFlockData &&
                !loadingFlockData &&
                parsedUserId &&
                parsedFlockId && (
                  <Button
                    text="Health Records"
                    style="primary"
                    onClick={handleManageHealthRecordsClick}
                  />
                )}
              {selectedFlockData &&
                !loadingFlockData &&
                parsedUserId &&
                parsedFlockId && (
                  <Button
                    text="Egg Records"
                    style="primary"
                    onClick={handleLogEggCollection}
                  />
                )}
              {selectedFlockData &&
                !loadingFlockData &&
                parsedUserId &&
                parsedFlockId && (
                  <Button
                    text="Feed Records"
                    style="primary"
                    onClick={handleManageFeedRecordsClick}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <PoultryEggCard
            latestMetrics={poultryEggCardStats.latestMetrics}
            onLogEggCollection={handleLogEggCollection}
            eggCollectionLineData={poultryEggCardStats.eggCollectionLineData}
            onManageClick={handleLogEggCollection}
            loading={poultryEggCardStats.loading}
            error={poultryEggCardStats.error}
            onPeriodChange={handleGraphPeriodChange}
            earliestDataDate={earliestEggDataDate}
          />

          {parsedUserId && parsedFlockId && (
            <PoultryFeedCard
              feedItems={poultryInventoryItems}
              getFeedLevelColor={getFeedLevelColor}
              loadingFeedItems={
                loadingPoultryInventory || loadingCalculatedFeedData
              }
              timesFedToday={timesFedToday}
              targetFeedingsPerDay={targetFeedingsPerDay}
              userId={parsedUserId}
              flockId={parsedFlockId}
              feedInventoryDays={feedInventoryDays}
              avgDailyConsumptionDisplay={avgDailyConsumptionDisplay}
            />
          )}
        </div>
      </div>
      {showFlockForm && selectedFlockData && (
        <FlockForm
          onClose={() => setShowFlockForm(false)}
          formTitle="Edit Flock Details"
          flockToEdit={selectedFlockData}
          onFlockUpdateOrAdd={() => {
            setShowFlockForm(false);
            fetchFlockData();
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default PoultryDetail;
