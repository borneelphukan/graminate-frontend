import { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
} from "chart.js";
import type {
  ChartData,
  ChartOptions,
  Chart,
  CartesianScaleOptions,
} from "chart.js";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  min as minDateFn,
  subDays as subDaysDateFns,
  addDays as addDaysDateFns,
  isValid as isValidDate,
} from "date-fns";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import Loader from "@/components/ui/Loader";
import { DailyFinancialEntry } from "@/pages/platform/[user_id]/finance";

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];

const TIME_RANGE_OPTIONS = ["Weekly", "Monthly", "3 Months"] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

const METRIC_COLORS: Record<FinancialMetric, { line: string; area: string }> = {
  Revenue: { line: "rgb(34, 197, 94)", area: "rgba(34, 197, 94, 0.2)" },
  COGS: { line: "rgb(234, 179, 8)", area: "rgba(234, 179, 8, 0.2)" },
  "Gross Profit": { line: "rgb(6, 182, 212)", area: "rgba(6, 182, 212, 0.2)" },
  Expenses: { line: "rgb(239, 68, 68)", area: "rgba(239, 68, 68, 0.2)" },
  "Net Profit": { line: "rgb(59, 130, 246)", area: "rgba(59, 130, 246, 0.2)" },
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const metricToKeyMap: Record<
  FinancialMetric,
  keyof Omit<DailyFinancialEntry, "date">
> = {
  Revenue: "revenue",
  COGS: "cogs",
  "Gross Profit": "grossProfit",
  Expenses: "expenses",
  "Net Profit": "netProfit",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

interface CompareGraphProps {
  initialFullHistoricalData: DailyFinancialEntry[];
  isLoadingData: boolean;
}

const CompareGraph = ({
  initialFullHistoricalData,
  isLoadingData,
}: CompareGraphProps) => {
  const [selectedMetric1, setSelectedMetric1] = useState<FinancialMetric>(
    FINANCIAL_METRICS[0]
  );
  const [selectedMetric2, setSelectedMetric2] = useState<FinancialMetric>(
    FINANCIAL_METRICS[1]
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    TIME_RANGE_OPTIONS[1]
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const fullHistoricalData = initialFullHistoricalData;

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const earliestDataPointDate = useMemo(
    () => (fullHistoricalData.length > 0 ? fullHistoricalData[0].date : null),
    [fullHistoricalData]
  );

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange, selectedMetric1, selectedMetric2, startDate, endDate]);

  const handleStartDateChange = (dS: string) => {
    if (dS) {
      const d = new Date(dS);
      if (isValidDate(d)) {
        d.setHours(0, 0, 0, 0);
        setStartDate(d);
        if (endDate && isBefore(endDate, d)) setEndDate(null);
      } else setStartDate(null);
    } else setStartDate(null);
  };

  const handleEndDateChange = (dS: string) => {
    if (dS) {
      const d = new Date(dS);
      if (isValidDate(d)) {
        d.setHours(23, 59, 59, 999);
        setEndDate(d);
        if (startDate && isBefore(d, startDate)) setStartDate(null);
      } else setEndDate(null);
    } else setEndDate(null);
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
    let pD = true;
    let nD = true;
    if (!isCustomDateRangeActive && earliestDataPointDate) {
      nD = dateOffset === 0;
      pD = false;
      if (selectedTimeRange === "Weekly") {
        const pW = subDaysDateFns(addWeeks(today, dateOffset - 1), 6);
        if (isBefore(pW, earliestDataPointDate)) pD = true;
      } else if (selectedTimeRange === "Monthly") {
        const pM = startOfMonth(addMonths(today, dateOffset - 1));
        if (isBefore(pM, earliestDataPointDate)) pD = true;
      } else {
        pD = true;
      }
    }
    return { isPrevDisabled: pD, isNextDisabled: nD };
  }, [
    dateOffset,
    selectedTimeRange,
    earliestDataPointDate,
    isCustomDateRangeActive,
  ]);
  const isPrevDisabled = navigationStates.isPrevDisabled;
  const isNextDisabled = navigationStates.isNextDisabled;

  const currentIntervalDates = useMemo(() => {
    if (fullHistoricalData.length === 0) return [];
    let vS: Date, vE: Date;
    if (isCustomDateRangeActive && startDate && endDate) {
      vS = startDate;
      vE = endDate;
    } else {
      const rD = today;
      if (selectedTimeRange === "Weekly") {
        const tD = addWeeks(rD, dateOffset);
        vE = tD;
        vS = subDaysDateFns(tD, 6);
      } else if (selectedTimeRange === "Monthly") {
        const tMD = addMonths(rD, dateOffset);
        vS = startOfMonth(tMD);
        vE = endOfMonth(tMD);
      } else {
        vS = startOfMonth(subMonths(rD, 2));
        vE = minDateFn([rD, endOfMonth(rD)]);
      }
    }
    return eachDayOfInterval({ start: vS, end: vE });
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    dateOffset,
    fullHistoricalData,
  ]);

  useEffect(() => {
    if (!chartRef.current || fullHistoricalData.length === 0) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const dateLabels: string[] = [];
    const dataValues1: (number | null)[] = [];
    const dataValues2: (number | null)[] = [];
    let xAxisTitleText: string = "";

    if (isCustomDateRangeActive && startDate && endDate) {
      xAxisTitleText = `Range: ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    } else {
      if (selectedTimeRange === "Weekly") {
        const vS = currentIntervalDates[0],
          vE = currentIntervalDates[currentIntervalDates.length - 1];
        xAxisTitleText = `Week: ${format(vS, "MMM d")} - ${format(
          vE,
          "MMM d, yyyy"
        )}`;
      } else if (selectedTimeRange === "Monthly") {
        const vS = currentIntervalDates[0];
        xAxisTitleText = `Month: ${format(vS, "MMMM yyyy")}`;
      } else {
        const vS = currentIntervalDates[0],
          vE = currentIntervalDates[currentIntervalDates.length - 1];
        xAxisTitleText = `Last 3 Months (${format(vS, "MMM yyyy")} - ${format(
          vE,
          "MMM yyyy"
        )})`;
      }
    }

    currentIntervalDates.forEach((day) => {
      const dataPoint = fullHistoricalData.find((fD) =>
        isSameDay(fD.date, day)
      );
      const metricKey1 = metricToKeyMap[selectedMetric1];
      const metricKey2 = metricToKeyMap[selectedMetric2];

      if (dataPoint) {
        if (
          isCustomDateRangeActive ||
          isBefore(day, addDaysDateFns(today, 1)) ||
          isSameDay(day, today)
        ) {
          dataValues1.push(
            dataPoint[metricKey1]
              ? Math.max(0, dataPoint[metricKey1].total)
              : null
          );
          dataValues2.push(
            dataPoint[metricKey2]
              ? Math.max(0, dataPoint[metricKey2].total)
              : null
          );
        } else {
          dataValues1.push(null);
          dataValues2.push(null);
        }
      } else {
        dataValues1.push(null);
        dataValues2.push(null);
      }
      dateLabels.push(
        format(
          day,
          isCustomDateRangeActive
            ? currentIntervalDates.length > 31
              ? "MMM d"
              : "d"
            : selectedTimeRange === "Weekly" || selectedTimeRange === "Monthly"
            ? "EEE d"
            : "MMM d"
        )
      );
    });

    const isDarkMode = document.documentElement.classList.contains("dark");
    const chartTitleText = `${selectedMetric1} vs ${selectedMetric2} - ${
      isCustomDateRangeActive ? "Custom Range" : selectedTimeRange
    }`;
    const yAxisLabelText = `Amount (INR)`;

    const data: ChartData<"bar"> = {
      labels: dateLabels,
      datasets: [
        {
          label: selectedMetric1,
          data: dataValues1,
          backgroundColor: METRIC_COLORS[selectedMetric1].line
            .replace("rgb", "rgba")
            .replace(")", ", 0.7)"),
          borderColor: METRIC_COLORS[selectedMetric1].line,
          borderWidth: 1,
        },
        {
          label: selectedMetric2,
          data: dataValues2,
          backgroundColor: METRIC_COLORS[selectedMetric2].line
            .replace("rgb", "rgba")
            .replace(")", ", 0.7)"),
          borderColor: METRIC_COLORS[selectedMetric2].line,
          borderWidth: 1,
        },
      ],
    };

    let maxTicks;
    if (isCustomDateRangeActive) {
      if (currentIntervalDates.length <= 7)
        maxTicks = currentIntervalDates.length;
      else if (currentIntervalDates.length <= 31)
        maxTicks = Math.ceil(
          currentIntervalDates.length /
            (currentIntervalDates.length > 15 ? 2 : 1)
        );
      else maxTicks = 15;
    } else {
      if (selectedTimeRange === "Weekly") maxTicks = 7;
      else if (selectedTimeRange === "Monthly")
        maxTicks =
          currentIntervalDates.length > 15 ? 15 : currentIntervalDates.length;
      else maxTicks = 12;
    }

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
          },
        },
        title: {
          display: true,
          text: chartTitleText,
          font: { size: 16 },
          color: isDarkMode ? "#FFF" : "#374151",
        },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
          callbacks: {
            label: (c) =>
              `${c.dataset.label || ""}: ${
                c.parsed.y !== null ? formatCurrency(c.parsed.y) : ""
              }`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisTitleText,
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
          ticks: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            autoSkip: true,
            maxTicksLimit: maxTicks,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabelText,
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
          ticks: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
      },
    };
    chartInstanceRef.current = new ChartJS(ctx, {
      type: "bar",
      data,
      options,
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [
    selectedMetric1,
    selectedMetric2,
    selectedTimeRange,
    dateOffset,
    startDate,
    endDate,
    isCustomDateRangeActive,
    fullHistoricalData,
    currentIntervalDates,
  ]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chartInstance = chartInstanceRef.current;
      if (
        !chartInstance ||
        !chartInstance.options ||
        !chartInstance.options.scales ||
        !chartInstance.options.plugins
      )
        return;
      const isDarkMode = document.documentElement.classList.contains("dark");
      const chartTitlePlugin = chartInstance.options.plugins.title;
      if (chartTitlePlugin)
        chartTitlePlugin.color = isDarkMode ? "#FFF" : "#374151";

      if (
        chartInstance.options.plugins.legend &&
        chartInstance.options.plugins.legend.labels
      ) {
        chartInstance.options.plugins.legend.labels.color = isDarkMode
          ? "#D1D5DB"
          : "#4B5563";
      }

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
          xScale.ticks.color = isDarkMode ? "#D1D5DB" : "#4B5563";
        if (xScale.grid)
          xScale.grid.color = isDarkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)";
      }
      if (yScale) {
        if (yScale.title)
          yScale.title.color = isDarkMode ? "#9CA3AF" : "#6B7280";
        if (yScale.ticks)
          yScale.ticks.color = isDarkMode ? "#D1D5DB" : "#4B5563";
        if (yScale.grid)
          yScale.grid.color = isDarkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)";
      }
      chartInstance.update("none");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handlePrev = () => setDateOffset((p) => p - 1);
  const handleNext = () => setDateOffset((p) => p + 1);
  const showTimeNavCtrl =
    !isCustomDateRangeActive &&
    (selectedTimeRange === "Weekly" || selectedTimeRange === "Monthly");

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg h-[500px] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 text-center sm:text-left">
          {selectedMetric1} vs {selectedMetric2}
        </h3>
        <p className="text-sm text-dark dark:text-light mb-4 text-center sm:text-left">
          Compare two financial metrics over a selected time period.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 my-4">
          <div className="w-full sm:col-span-1 xl:col-span-1">
            <DropdownSmall
              label="First Financial Metric"
              items={FINANCIAL_METRICS.slice()}
              selected={selectedMetric1}
              onSelect={(i) => setSelectedMetric1(i as FinancialMetric)}
            />
          </div>
          <div className="w-full sm:col-span-1 xl:col-span-1">
            <DropdownSmall
              label="Second Financial Metric"
              items={FINANCIAL_METRICS.slice()}
              selected={selectedMetric2}
              onSelect={(i) => setSelectedMetric2(i as FinancialMetric)}
            />
          </div>
          <div className="w-full sm:col-span-1 xl:col-span-1">
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
          <div className="w-full sm:col-span-1 xl:col-span-1">
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
            <div className="w-full sm:col-span-2 xl:col-span-1">
              <DropdownSmall
                label="Time Range"
                items={TIME_RANGE_OPTIONS.slice()}
                selected={selectedTimeRange}
                onSelect={(i) => {
                  setSelectedTimeRange(i as TimeRange);
                  setStartDate(null);
                  setEndDate(null);
                }}
                placeholder="Select Time Range"
              />
            </div>
          )}
        </div>
      </div>
      <div className="relative h-72 sm:h-80 md:h-96">
        <canvas ref={chartRef}></canvas>
      </div>
      {showTimeNavCtrl && (
        <div className="flex justify-center items-center gap-x-3 mt-4">
          <Button
            text="Previous"
            arrow="left"
            style="ghost"
            isDisabled={isPrevDisabled}
            onClick={handlePrev}
          />{" "}
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

export default CompareGraph;
