import {
  faBasketShopping,
  faPlusCircle,
  faChartLine,
  faThLarge,
  faExclamationTriangle,
  faExclamationCircle,
  faEgg,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Line } from "react-chartjs-2";
import React, { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Title,
  ChartData,
  ChartOptions,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import {
  addWeeks,
  subMonths,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isBefore,
  min as minDateFn,
  addDays as addDaysDateFns,
} from "date-fns";
import Loader from "@/components/ui/Loader";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import ToggleSwitch from "@/components/ui/Switch/ToggleSwitch";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

interface LatestEggMetrics {
  totalEggs: number;
  brokenEggs: number;
  smallEggs: number;
  mediumEggs: number;
  largeEggs: number;
  extraLargeEggs: number;
}

export type PeriodOption = "Weekly" | "Monthly" | "3 Months";
const TIME_RANGE_OPTIONS: PeriodOption[] = ["Weekly", "Monthly", "3 Months"];
const today = new Date();
today.setHours(0, 0, 0, 0);

type ViewOption = "graphs" | "metrics";

type Props = {
  latestMetrics: LatestEggMetrics | null;
  onLogEggCollection: () => void;
  eggCollectionLineData: ChartData<"line">;
  eggCollectionLineOptions?: Partial<ChartOptions<"line">>;
  onManageClick: () => void;
  loading: boolean;
  error: string | null;
  onPeriodChange: (startDate: Date, endDate: Date) => void;
  earliestDataDate: Date | null;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
  isLoading?: boolean;
  isLatest?: boolean;
};

const MetricItem = ({
  icon,
  value,
  label,
  isLoading,
  isLatest,
}: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-300 mb-2"
      aria-hidden="true"
    />
    {isLoading ? (
      <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
    ) : (
      <p className="text-lg font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    )}
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {label} {isLatest && <span className="text-xs">(Last Entry)</span>}
    </p>
  </div>
);

const PoultryEggCard = ({
  latestMetrics,
  eggCollectionLineData: rawEggCollectionLineData,
  eggCollectionLineOptions = {},
  onManageClick,
  loading,
  error,
  onPeriodChange,
  earliestDataDate,
}: Props) => {
  const [activeView, setActiveView] = useState<ViewOption>("graphs");
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<PeriodOption>("Weekly");
  const [dateOffset, setDateOffset] = useState(0);

  const viewToggleOptions: {
    value: ViewOption;
    label: string;
    icon: IconDefinition;
  }[] = [
    { value: "graphs", label: "Graphs", icon: faChartLine },
    { value: "metrics", label: "Metrics", icon: faThLarge },
  ];

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const currentInterval = useMemo(() => {
    let viewStartDate: Date;
    let viewEndDate: Date;
    const referenceDate = today;

    if (selectedTimeRange === "Weekly") {
      const targetWeekStart = startOfWeek(addWeeks(referenceDate, dateOffset), {
        weekStartsOn: 1,
      });
      viewStartDate = targetWeekStart;
      viewEndDate = endOfWeek(targetWeekStart, { weekStartsOn: 1 });
    } else if (selectedTimeRange === "Monthly") {
      const targetMonthStart = startOfMonth(
        addMonths(referenceDate, dateOffset)
      );
      viewStartDate = targetMonthStart;
      viewEndDate = endOfMonth(targetMonthStart);
    } else {
      const threeMonthsViewEnd = endOfMonth(
        addMonths(referenceDate, dateOffset)
      );
      viewEndDate = minDateFn([threeMonthsViewEnd, today]);
      viewStartDate = startOfMonth(subMonths(viewEndDate, 2));
    }
    return { viewStartDate, viewEndDate };
  }, [selectedTimeRange, dateOffset]);

  useEffect(() => {
    onPeriodChange(currentInterval.viewStartDate, currentInterval.viewEndDate);
  }, [currentInterval, onPeriodChange]);

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange]);

  const navigationStates = useMemo(() => {
    let isPrevDisabled = false;
    let isNextDisabled = dateOffset === 0;

    if (earliestDataDate) {
      if (selectedTimeRange === "Weekly") {
        const prevWeekStart = startOfWeek(addWeeks(today, dateOffset - 1), {
          weekStartsOn: 1,
        });
        isPrevDisabled =
          isBefore(prevWeekStart, earliestDataDate) &&
          !isBefore(addDaysDateFns(earliestDataDate, 6), prevWeekStart);
      } else if (selectedTimeRange === "Monthly") {
        const prevMonthStart = startOfMonth(addMonths(today, dateOffset - 1));
        isPrevDisabled =
          isBefore(prevMonthStart, earliestDataDate) &&
          !isBefore(endOfMonth(earliestDataDate), prevMonthStart);
      } else if (selectedTimeRange === "3 Months") {
        const threeMonthsAgoStart = startOfMonth(
          subMonths(addMonths(today, dateOffset), 2 + 3)
        );
        isPrevDisabled =
          isBefore(threeMonthsAgoStart, earliestDataDate) &&
          !isBefore(
            endOfMonth(addMonths(earliestDataDate, 2)),
            threeMonthsAgoStart
          );
      }
    } else {
      isPrevDisabled = true;
    }
    return { isPrevDisabled, isNextDisabled };
  }, [dateOffset, selectedTimeRange, earliestDataDate]);

  const handleTimeRangeSelect = (period: string) => {
    setSelectedTimeRange(period as PeriodOption);
  };
  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);

  const textColor = isDarkTheme ? "#e5e7eb" : "#374151";
  const gridColor = isDarkTheme
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.1)";

  const eggCollectionLineData = useMemo(() => {
    if (!rawEggCollectionLineData || !rawEggCollectionLineData.datasets) {
      return { labels: [], datasets: [] };
    }
    const newDatasets = rawEggCollectionLineData.datasets.map((dataset) => {
      let newLabel = dataset.label || "";
      if (newLabel === "Small") newLabel = "Small Eggs";
      else if (newLabel === "Medium") newLabel = "Medium Eggs";
      else if (newLabel === "Large") newLabel = "Large Eggs";
      else if (newLabel === "Extra Large") newLabel = "Extra Large Eggs";
      else if (newLabel === "Total Collected") newLabel = "Total Eggs";

      const newFill = newLabel !== "Total Eggs";

      return {
        ...dataset,
        label: newLabel,
        fill: newFill ? false : dataset.fill,
        backgroundColor: newFill ? "transparent" : dataset.backgroundColor,
      };
    });
    return { ...rawEggCollectionLineData, datasets: newDatasets };
  }, [rawEggCollectionLineData]);

  const defaultLineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: textColor,
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        mode: "index",
        intersect: false,
        callbacks: {
          labelPointStyle: function (context) {
            return {
              pointStyle: "circle",
              rotation: 0,
            };
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
        },
      },
      y: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
        },
        beginAtZero: true,
        title: {
          display: true,
          text: "Quantity of Eggs",
          color: textColor,
        },
      },
    },
  };

  const finalOptions = { ...defaultLineOptions, ...eggCollectionLineOptions };

  const getDominantEggSize = (metrics: LatestEggMetrics | null): string => {
    if (!metrics) {
      return "N/A";
    }
    // Abbreviation or complete size
    const sizesMap = {
      S: metrics.smallEggs || 0,
      M: metrics.mediumEggs || 0,
      L: metrics.largeEggs || 0,
      XL: metrics.extraLargeEggs || 0,
    };

    let maxCount = 0;
    for (const size in sizesMap) {
      if (sizesMap[size as keyof typeof sizesMap] > maxCount) {
        maxCount = sizesMap[size as keyof typeof sizesMap];
      }
    }

    if (maxCount === 0) {
      return "N/A";
    }

    const dominantSizes = [];
    for (const size in sizesMap) {
      if (sizesMap[size as keyof typeof sizesMap] === maxCount) {
        dominantSizes.push(`${size} (${maxCount.toLocaleString()})`);
      }
    }
    return dominantSizes.join(", ");
  };

  const renderContent = () => {
    if (loading && eggCollectionLineData.datasets.length === 0) {
      return (
        <div className="flex justify-center items-center h-full min-h-[300px]">
          <Loader />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-full min-h-[300px] text-center p-4">
          <FontAwesomeIcon
            icon={faExclamationCircle}
            className="h-12 w-12 text-red-500 mb-4"
          />
          <p className="text-red-500 dark:text-red-400 font-semibold">
            Error loading egg data
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      );
    }

    if (activeView === "metrics") {
      return (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <MetricItem
            icon={faEgg}
            value={getDominantEggSize(latestMetrics)}
            label="Dominant Size(s)"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <MetricItem
            icon={faExclamationTriangle}
            value={
              latestMetrics ? latestMetrics.brokenEggs.toLocaleString() : "N/A"
            }
            label="Broken Eggs"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <MetricItem
            icon={faBasketShopping}
            value={
              latestMetrics ? latestMetrics.totalEggs.toLocaleString() : "N/A"
            }
            label="Eggs Collected"
            isLoading={loading && !latestMetrics}
            isLatest={!!latestMetrics}
          />
          <div
            onClick={!loading ? onManageClick : undefined}
            className={`${
              !loading
                ? "cursor-pointer hover:shadow-lg"
                : "cursor-not-allowed opacity-50"
            } transition-shadow duration-200`}
          >
            <MetricItem
              icon={faPlusCircle}
              value={"Log & View Data"}
              label="Manage Egg Records"
              isLoading={loading}
            />
          </div>
        </div>
      );
    }

    if (activeView === "graphs") {
      if (
        eggCollectionLineData.labels?.length === 0 &&
        (!eggCollectionLineData.datasets ||
          eggCollectionLineData.datasets.every((ds) => ds.data.length === 0)) &&
        !loading
      ) {
        return (
          <div className="flex flex-col justify-center items-center h-full min-h-[300px] text-center p-4">
            <FontAwesomeIcon
              icon={faChartLine}
              className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
            />
            <p className="text-gray-600 dark:text-gray-400 font-semibold">
              No egg collection data available for the selected period.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Try logging some egg collections or adjusting filters.
            </p>
          </div>
        );
      }
      return (
        <>
          <div className="flex-grow mt-2" style={{ minHeight: "300px" }}>
            <div className="relative h-full min-h-[250px] sm:min-h-[280px] md:min-h-[320px]">
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex justify-center items-center z-10">
                  <Loader />
                </div>
              )}

              <Line options={finalOptions} data={eggCollectionLineData} />
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 mt-5">
            <Button
              arrow="left"
              text="Previous"
              onClick={handlePrev}
              style="ghost"
              isDisabled={navigationStates.isPrevDisabled || loading}
            />
            <DropdownSmall
              direction="up"
              items={TIME_RANGE_OPTIONS}
              selected={selectedTimeRange}
              onSelect={handleTimeRangeSelect}
            />
            <Button
              arrow="right"
              text="Next"
              onClick={handleNext}
              style="ghost"
              isDisabled={navigationStates.isNextDisabled || loading}
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-1">
        <h2 className="text-xl font-semibold text-dark dark:text-light text-center sm:text-left mb-2 sm:mb-0">
          Egg Collection & Grading
        </h2>
        <ToggleSwitch
          options={viewToggleOptions}
          activeOption={activeView}
          onToggle={(option) => setActiveView(option)}
        />
      </div>

      {activeView === "graphs" && (
        <div className="flex flex-col sm:flex-row justify-end items-center my-3 gap-2">
          <div className="w-full sm:w-auto"></div>
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default PoultryEggCard;
