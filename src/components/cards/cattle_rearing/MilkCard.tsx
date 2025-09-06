import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Chart,
  CartesianScaleOptions,
} from "chart.js";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  format,
  subMonths,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  isBefore,
  isValid as isValidDate,
  subDays as subDaysDateFns,
  isSameDay,
} from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlassWaterDroplet } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/router";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

const TIME_RANGE_OPTIONS = ["Weekly", "1 Month", "3 Months"] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
const ALL_ANIMALS_FILTER = "Overall Milk Production";

type CattleMilkRecordFromApi = {
  milk_id: number;
  cattle_id: number;
  user_id: number;
  date_collected: string;
  animal_name: string | null;
  milk_produced: string;
  date_logged: string;
};

type ProcessedCattleMilkRecord = {
  milk_id: number;
  cattle_id: number;
  user_id: number;
  date_collected: Date;
  animal_name: string | null;
  milk_produced: number;
  date_logged: string;
};

interface MilkCardProps {
  userId?: string;
  cattleId?: string;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const MilkCard = ({ userId, cattleId }: MilkCardProps) => {
  const router = useRouter();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    TIME_RANGE_OPTIONS[0]
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [allMilkRecords, setAllMilkRecords] = useState<
    ProcessedCattleMilkRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableAnimals, setAvailableAnimals] = useState<string[]>([]);
  const [selectedAnimalFilter, setSelectedAnimalFilter] =
    useState<string>(ALL_ANIMALS_FILTER);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<Chart<"bar"> | null>(null);

  useEffect(() => {
    setDateOffset(0);
    setSelectedAnimalFilter(ALL_ANIMALS_FILTER);
  }, [selectedTimeRange, startDate, endDate, cattleId]);

  const handleStartDateChange = (dateString: string) => {
    if (dateString) {
      const d = new Date(dateString);
      if (isValidDate(d)) {
        d.setHours(0, 0, 0, 0);
        setStartDate(d);
        if (endDate && isBefore(endDate, d)) setEndDate(null);
      } else {
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (dateString: string) => {
    if (dateString) {
      const d = new Date(dateString);
      if (isValidDate(d)) {
        d.setHours(23, 59, 59, 999);
        setEndDate(d);
        if (startDate && isBefore(d, startDate)) setStartDate(null);
      } else {
        setEndDate(null);
      }
    } else {
      setEndDate(null);
    }
  };

  const isCustomDateRangeActive = useMemo(
    () =>
      !!(
        startDate &&
        endDate &&
        isValidDate(startDate) &&
        isValidDate(endDate) &&
        !isBefore(endDate, startDate)
      ),
    [startDate, endDate]
  );

  const navigationStates = useMemo(() => {
    let prevDisabled = true;
    let nextDisabled = true;

    if (!isCustomDateRangeActive) {
      nextDisabled = dateOffset === 0;
      if (selectedTimeRange === "Weekly" || selectedTimeRange === "1 Month") {
        prevDisabled = false;
      } else {
        prevDisabled = true;
      }
    }
    return { isPrevDisabled: prevDisabled, isNextDisabled: nextDisabled };
  }, [dateOffset, selectedTimeRange, isCustomDateRangeActive]);

  const isPrevDisabled = navigationStates.isPrevDisabled;
  const isNextDisabled = navigationStates.isNextDisabled;

  const currentIntervalDates = useMemo(() => {
    let viewStart: Date, viewEnd: Date;
    if (isCustomDateRangeActive && startDate && endDate) {
      viewStart = startDate;
      viewEnd = endDate;
    } else {
      const refDate = today;
      if (selectedTimeRange === "Weekly") {
        const targetDate = addWeeks(refDate, dateOffset);
        viewEnd = targetDate;
        viewStart = subDaysDateFns(targetDate, 6);
      } else if (selectedTimeRange === "1 Month") {
        const targetMonthDate = addMonths(refDate, dateOffset);
        viewStart = new Date(
          targetMonthDate.getFullYear(),
          targetMonthDate.getMonth(),
          1
        );
        viewEnd = new Date(
          targetMonthDate.getFullYear(),
          targetMonthDate.getMonth() + 1,
          0
        );

        if (dateOffset === 0) {
          viewEnd = new Date(Math.min(refDate.getTime(), viewEnd.getTime()));
        } else if (isBefore(viewEnd, viewStart)) {
          viewStart = new Date(viewEnd.getFullYear(), viewEnd.getMonth(), 1);
        }
      } else {
        viewEnd = refDate;
        viewStart = subMonths(refDate, 3);
      }
    }
    if (
      isValidDate(viewStart) &&
      isValidDate(viewEnd) &&
      !isBefore(viewEnd, viewStart)
    ) {
      return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }
    return [];
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    dateOffset,
  ]);

  useEffect(() => {
    if (!cattleId) {
      setIsLoading(false);
      setAllMilkRecords([]);
      setAvailableAnimals([]);
      setSelectedAnimalFilter(ALL_ANIMALS_FILTER);
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            barChartRef.current.width,
            barChartRef.current.height
          );
        }
      }
      return;
    }

    const fetchMilkData = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get<{
          cattleMilkRecords: CattleMilkRecordFromApi[];
        }>(`/cattle-milk/cattle/${cattleId}`);

        const processedRecords = response.data.cattleMilkRecords.map(
          (record: CattleMilkRecordFromApi) => ({
            ...record,
            date_collected: new Date(record.date_collected),
            milk_produced: parseFloat(record.milk_produced) || 0,
          })
        );
        setAllMilkRecords(processedRecords);

        const uniqueAnimalNames = Array.from(
          new Set(
            processedRecords
              .map((r) => r.animal_name)
              .filter((name): name is string => !!name && name.trim() !== "")
          )
        ).sort();
        setAvailableAnimals([ALL_ANIMALS_FILTER, ...uniqueAnimalNames]);
        setSelectedAnimalFilter(ALL_ANIMALS_FILTER);
      } catch (error) {
        console.error("Error fetching milk data:", error);
        setAllMilkRecords([]);
        setAvailableAnimals([]);
        setSelectedAnimalFilter(ALL_ANIMALS_FILTER);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilkData();
  }, [cattleId]);

  useEffect(() => {
    if (isLoading || !barChartRef.current) {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            barChartRef.current.width,
            barChartRef.current.height
          );
        }
      }
      return;
    }

    if (currentIntervalDates.length === 0) {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            barChartRef.current.width,
            barChartRef.current.height
          );
        }
      }
      return;
    }

    const ctx = barChartRef.current.getContext("2d");
    if (!ctx) return;

    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
    }

    let xAxisSubtitle = "";
    if (isCustomDateRangeActive && startDate && endDate) {
      xAxisSubtitle = `Range: ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    } else {
      const viewStart = currentIntervalDates[0];
      const viewEnd = currentIntervalDates[currentIntervalDates.length - 1];
      if (selectedTimeRange === "Weekly") {
        xAxisSubtitle = `Week: ${format(viewStart, "MMM d")} - ${format(
          viewEnd,
          "MMM d, yyyy"
        )}`;
      } else if (selectedTimeRange === "1 Month") {
        xAxisSubtitle = `Period: ${format(viewStart, "MMM d, yyyy")} - ${format(
          viewEnd,
          "MMM d, yyyy"
        )}`;
      } else {
        xAxisSubtitle = `Last 3 Months: ${format(
          viewStart,
          "MMM d, yyyy"
        )} - ${format(viewEnd, "MMM d, yyyy")}`;
      }
    }

    const labels = currentIntervalDates.map((date) =>
      format(
        date,
        currentIntervalDates.length > 31
          ? "MMM d"
          : currentIntervalDates.length > 7 &&
            (selectedTimeRange === "1 Month" ||
              selectedTimeRange === "3 Months" ||
              isCustomDateRangeActive)
          ? "d"
          : "EEE d"
      )
    );

    const recordsToConsider =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? allMilkRecords
        : allMilkRecords.filter(
            (record) => record.animal_name === selectedAnimalFilter
          );

    const milkProducedData = currentIntervalDates.map((intervalDate) => {
      const recordsForDate = recordsToConsider.filter((record) =>
        isSameDay(record.date_collected, intervalDate)
      );
      const totalMilkForDate = recordsForDate.reduce(
        (sum, record) => sum + record.milk_produced,
        0
      );
      return totalMilkForDate;
    });

    const datasetLabel =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? "Total Milk Produced (Liters)"
        : `Milk Produced - ${selectedAnimalFilter} (Liters)`;

    const barChartData: ChartData<"bar"> = {
      labels: labels,
      datasets: [
        {
          label: datasetLabel,
          data: milkProducedData,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    };

    const isDarkMode = document.documentElement.classList.contains("dark");
    let maxTicksLimit;
    if (isCustomDateRangeActive) {
      if (currentIntervalDates.length <= 7)
        maxTicksLimit = currentIntervalDates.length;
      else if (currentIntervalDates.length <= 31)
        maxTicksLimit = Math.ceil(
          currentIntervalDates.length /
            (currentIntervalDates.length > 15 ? 2 : 1)
        );
      else maxTicksLimit = 15;
    } else {
      if (selectedTimeRange === "Weekly") maxTicksLimit = 7;
      else if (selectedTimeRange === "1 Month")
        maxTicksLimit =
          currentIntervalDates.length > 15 ? 15 : currentIntervalDates.length;
      else maxTicksLimit = 12;
    }

    const chartTitleText =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? "Herd Milk Production Overview"
        : `Milk Production: ${selectedAnimalFilter}`;

    const barChartOptions: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: isDarkMode ? "#e5e7eb" : "#4b5563",
            boxWidth: 12,
          },
        },
        title: {
          display: true,
          text: chartTitleText,
          color: isDarkMode ? "#e5e7eb" : "#1f2937",
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2) + " L";
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisSubtitle,
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            autoSkip: true,
            maxTicksLimit: maxTicksLimit,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Milk (Liters)",
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            callback: function (value) {
              return value + " L";
            },
          },
        },
      },
    };

    barChartInstanceRef.current = new ChartJS(ctx, {
      type: "bar",
      data: barChartData,
      options: barChartOptions,
    }) as Chart<"bar">;

    return () => {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
    };
  }, [
    selectedTimeRange,
    currentIntervalDates,
    isCustomDateRangeActive,
    startDate,
    endDate,
    allMilkRecords,
    isLoading,
    selectedAnimalFilter,
  ]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chartInstance = barChartInstanceRef.current;
      if (
        !chartInstance ||
        !chartInstance.options ||
        !chartInstance.options.plugins
      )
        return;

      const isDarkMode = document.documentElement.classList.contains("dark");

      if (chartInstance.options.plugins.title) {
        chartInstance.options.plugins.title.color = isDarkMode
          ? "#e5e7eb"
          : "#1f2937";
      }
      if (
        chartInstance.options.plugins.legend &&
        chartInstance.options.plugins.legend.labels
      ) {
        chartInstance.options.plugins.legend.labels.color = isDarkMode
          ? "#e5e7eb"
          : "#4b5563";
      }

      if (chartInstance.options.scales) {
        const xScale = chartInstance.options.scales.x as
          | CartesianScaleOptions
          | undefined;
        const yScale = chartInstance.options.scales.y as
          | CartesianScaleOptions
          | undefined;

        if (xScale) {
          if (xScale.title)
            xScale.title.color = isDarkMode ? "#9CA3AF" : "#6B7280";
          if (xScale.ticks)
            xScale.ticks.color = isDarkMode ? "#d1d5db" : "#6b7280";
          if (xScale.grid)
            xScale.grid.color = isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)";
        }
        if (yScale) {
          if (yScale.title)
            yScale.title.color = isDarkMode ? "#9CA3AF" : "#6B7280";
          if (yScale.ticks)
            yScale.ticks.color = isDarkMode ? "#d1d5db" : "#6b7280";
          if (yScale.grid)
            yScale.grid.color = isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)";
        }
      }
      chartInstance.update("none");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleViewLogs = () => {
    if (userId && cattleId) {
      router.push(
        `/platform/${userId}/cattle_rearing/cattle-milk?cattleId=${cattleId}`
      );
    }
  };

  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);
  const showTimeNavControls =
    !isCustomDateRangeActive &&
    (selectedTimeRange === "Weekly" || selectedTimeRange === "1 Month");

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2">
          <div className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-200">
            <FontAwesomeIcon
              icon={faGlassWaterDroplet}
              className="mr-3 text-blue-500"
            />
            Milk Production
          </div>
          <Button
            text="View / Log Milking"
            style="primary"
            onClick={handleViewLogs}
            isDisabled={!userId || !cattleId}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center sm:text-left">
          Select a time range or specify a custom date range for an overview.
        </p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start gap-3 sm:gap-4 my-4">
          <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
            <TextField
              label="Start Date"
              calendar
              value={
                startDate && isValidDate(startDate)
                  ? format(startDate, "yyyy-MM-dd")
                  : ""
              }
              onChange={handleStartDateChange}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
            <TextField
              label="End Date"
              calendar
              value={
                endDate && isValidDate(endDate)
                  ? format(endDate, "yyyy-MM-dd")
                  : ""
              }
              onChange={handleEndDateChange}
              placeholder="YYYY-MM-DD"
              isDisabled={!startDate || !isValidDate(startDate)}
            />
          </div>
          {!isCustomDateRangeActive && (
            <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
              <DropdownSmall
                label="Time Range"
                items={TIME_RANGE_OPTIONS.slice()}
                selected={selectedTimeRange}
                onSelect={(item) => {
                  setSelectedTimeRange(item as TimeRange);
                  setStartDate(null);
                  setEndDate(null);
                }}
                placeholder="Select Time Range"
              />
            </div>
          )}
          {availableAnimals.length > 1 && (
            <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
              <DropdownSmall
                label="Filter by Animal"
                items={availableAnimals}
                selected={selectedAnimalFilter}
                onSelect={(item) => setSelectedAnimalFilter(item)}
                placeholder="Select Animal"
              />
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-grow"
        style={{ minHeight: "300px", position: "relative" }}
      >
        <canvas ref={barChartRef}></canvas>
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 z-10">
            <Loader />
          </div>
        )}
        {!isLoading && currentIntervalDates.length === 0 && (
          <div className="absolute inset-0 flex justify-center items-center text-gray-500 dark:text-gray-400">
            Select a valid date range to view data.
          </div>
        )}
        {!isLoading &&
          currentIntervalDates.length > 0 &&
          allMilkRecords.length === 0 &&
          cattleId && <></>}

        {!isLoading &&
          currentIntervalDates.length > 0 &&
          allMilkRecords.length > 0 &&
          selectedAnimalFilter !== ALL_ANIMALS_FILTER &&
          (() => {
            const recordsToConsider =
              selectedAnimalFilter === ALL_ANIMALS_FILTER
                ? allMilkRecords
                : allMilkRecords.filter(
                    (record) => record.animal_name === selectedAnimalFilter
                  );
            const milkProducedData = currentIntervalDates.map(
              (intervalDate) => {
                const recordsForDate = recordsToConsider.filter((record) =>
                  isSameDay(record.date_collected, intervalDate)
                );
                const totalMilkForDate = recordsForDate.reduce(
                  (sum, record) => sum + record.milk_produced,
                  0
                );
                return totalMilkForDate;
              }
            );
            return !milkProducedData.some((value) => value > 0) ? <></> : null;
          })()}
      </div>
      {showTimeNavControls && currentIntervalDates.length > 0 && !isLoading && (
        <div className="flex justify-center items-center gap-x-3 mt-4">
          <Button
            text="Previous"
            arrow="left"
            style="ghost"
            isDisabled={isPrevDisabled}
            onClick={handlePrev}
          />
          <Button
            text="Next"
            arrow="right"
            style="ghost"
            isDisabled={isNextDisabled}
            onClick={handleNext}
          />
        </div>
      )}
    </div>
  );
};

export default MilkCard;
