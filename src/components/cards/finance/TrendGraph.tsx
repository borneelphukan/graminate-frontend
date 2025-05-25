import { useState, useEffect, useRef, useMemo } from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  DoughnutController,
  ArcElement,
} from "chart.js";
import type {
  ChartData,
  ChartOptions,
  Chart,
  CartesianScaleOptions,
  Plugin,
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
import { DailyFinancialEntry } from "@/pages/platform/[user_id]/finance_dashboard";

ChartJS.register(
  LineController,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

const DOUGHNUT_CHART_COLORS = [
  "rgba(75, 192, 192, 0.9)",
  "rgba(255, 159, 64, 0.9)",
  "rgba(153, 102, 255, 0.9)",
  "rgba(255, 99, 132, 0.9)",
  "rgba(54, 162, 235, 0.9)",
  "rgba(255, 206, 86, 0.9)",
  "rgba(128,128,128, 0.9)",
  "rgba(239, 68, 68, 0.9)", // Added red
  "rgba(34, 197, 94, 0.9)", // Added green
  "rgba(234, 179, 8, 0.9)", // Added yellow
  "rgba(6, 182, 212, 0.9)", // Added cyan
  "rgba(59, 130, 246, 0.9)", // Added blue
];

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

type CenterTextPluginOptions = {
  textLines: {
    text: string;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
  }[];
  defaultColor: string;
  defaultFontStyle: string;
  defaultFontSize: number;
  defaultFontFamily: string;
};

const centerTextPlugin: Plugin<"doughnut", CenterTextPluginOptions> = {
  id: "centerText",
  afterDraw: (chart) => {
    const pluginOptions = (chart.options.plugins as any)?.centerText as
      | CenterTextPluginOptions
      | undefined;
    if (
      (chart.config as any).type === "doughnut" &&
      pluginOptions &&
      pluginOptions.textLines &&
      pluginOptions.textLines.length > 0
    ) {
      const {
        textLines,
        defaultColor,
        defaultFontStyle,
        defaultFontSize,
        defaultFontFamily,
      } = pluginOptions;
      const ctx = chart.ctx;
      const cX = (chart.chartArea.left + chart.chartArea.right) / 2;
      const cY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tL = textLines.length;
      const bLH = defaultFontSize * 1.2;
      let cYPos = cY - ((tL - 1) * bLH) / 2;
      textLines.forEach((l) => {
        const fS = l.fontSize || defaultFontSize;
        const fSt = defaultFontStyle;
        const fF = l.fontFamily || defaultFontFamily;
        const clr = l.color || defaultColor;
        ctx.font = `${fSt} ${fS}px ${fF}`;
        ctx.fillStyle = clr;
        ctx.fillText(l.text, cX, cYPos);
        cYPos += bLH;
      });
      ctx.restore();
    }
  },
};

interface TrendGraphProps {
  initialFullHistoricalData: DailyFinancialEntry[];
  initialSubTypes: string[];
  isLoadingData: boolean;
}

const TrendGraph = ({
  initialFullHistoricalData,
  initialSubTypes,
  isLoadingData,
}: TrendGraphProps) => {
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetric>(
    FINANCIAL_METRICS[0]
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    TIME_RANGE_OPTIONS[1]
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const fullHistoricalData = initialFullHistoricalData;
  const subTypes = initialSubTypes;

  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstanceRef = useRef<Chart | null>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartInstanceRef = useRef<Chart | null>(null);

  const earliestDataPointDate = useMemo(
    () => (fullHistoricalData.length > 0 ? fullHistoricalData[0].date : null),
    [fullHistoricalData]
  );

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange, selectedMetric, startDate, endDate]);

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
    if (!lineChartRef.current || fullHistoricalData.length === 0) return;
    const ctx = lineChartRef.current.getContext("2d");
    if (!ctx) return;
    if (lineChartInstanceRef.current) lineChartInstanceRef.current.destroy();

    const dateLabels: string[] = [];
    let pointRadiusValue = 3;
    let xAxisSubtitle = "";

    if (isCustomDateRangeActive && startDate && endDate) {
      xAxisSubtitle = `Range: ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    } else {
      if (selectedTimeRange === "Weekly") {
        const viewStart = currentIntervalDates[0];
        const viewEnd = currentIntervalDates[currentIntervalDates.length - 1];
        xAxisSubtitle = `Week: ${format(viewStart, "MMM d")} - ${format(
          viewEnd,
          "MMM d, yyyy"
        )}`;
      } else if (selectedTimeRange === "Monthly") {
        const viewStart = currentIntervalDates[0];
        xAxisSubtitle = `Month: ${format(viewStart, "MMMM yyyy")}`;
      } else {
        // 3 Months
        const viewStart = currentIntervalDates[0];
        const viewEnd = currentIntervalDates[currentIntervalDates.length - 1];
        xAxisSubtitle = `Last 3 Months (${format(
          viewStart,
          "MMM yyyy"
        )} - ${format(viewEnd, "MMM yyyy")})`;
        pointRadiusValue = 1.5;
      }
    }

    currentIntervalDates.forEach((d) => {
      dateLabels.push(
        format(
          d,
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

    if (!isCustomDateRangeActive && selectedTimeRange === "3 Months")
      pointRadiusValue = 1.5;
    else if (currentIntervalDates.length > 60 && isCustomDateRangeActive)
      pointRadiusValue = 1;
    else pointRadiusValue = 3;

    const datasets = subTypes.map((occupation, index) => {
      const occupationDataValues: (number | null)[] = [];
      currentIntervalDates.forEach((d) => {
        const dataPoint = fullHistoricalData.find((fD) =>
          isSameDay(fD.date, d)
        );
        const metricKey = metricToKeyMap[selectedMetric];
        let value: number | null = null;
        if (
          dataPoint &&
          dataPoint[metricKey] &&
          dataPoint[metricKey].breakdown
        ) {
          const occupationEntry = dataPoint[metricKey].breakdown.find(
            (bd) => bd.name === occupation
          );
          if (occupationEntry) {
            value = occupationEntry.value;
          }
        }

        if (
          isCustomDateRangeActive ||
          isBefore(d, addDaysDateFns(today, 1)) ||
          isSameDay(d, today)
        ) {
          occupationDataValues.push(value);
        } else {
          occupationDataValues.push(null);
        }
      });

      const color = DOUGHNUT_CHART_COLORS[index % DOUGHNUT_CHART_COLORS.length];
      return {
        label: occupation,
        data: occupationDataValues,
        borderColor: color,
        backgroundColor: color.replace("0.9", "0.1"),
        tension: 0.2,
        fill: false,
        pointBackgroundColor: color,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: color,
        pointRadius: pointRadiusValue,
        pointHoverRadius: pointRadiusValue + 2,
        spanGaps: true,
      };
    });

    const isDarkMode = document.documentElement.classList.contains("dark");
    const chartTitleText = `${selectedMetric} Trend by Occupation - ${
      isCustomDateRangeActive ? "Custom Range" : selectedTimeRange
    }`;
    const yAxisLabelText = `Amount (INR)`;

    const lineChartData: ChartData<"line"> = {
      labels: dateLabels,
      datasets: datasets,
    };

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
      else if (selectedTimeRange === "Monthly")
        maxTicksLimit =
          currentIntervalDates.length > 15 ? 15 : currentIntervalDates.length;
      else maxTicksLimit = 12;
    }

    const lineChartOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            boxWidth: 12,
            padding: 15,
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
            label: (context) =>
              `${context.dataset.label || ""}: ${
                context.parsed.y !== null
                  ? formatCurrency(context.parsed.y)
                  : "N/A"
              }`,
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
            color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
          ticks: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            autoSkip: true,
            maxTicksLimit: maxTicksLimit,
          },
        },
        y: {
          beginAtZero: false,
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
            callback: (value) =>
              typeof value === "number" ? formatCurrency(value) : value,
          },
        },
      },
    };
    lineChartInstanceRef.current = new ChartJS(ctx, {
      type: "line",
      data: lineChartData,
      options: lineChartOptions,
    });
    return () => {
      if (lineChartInstanceRef.current) lineChartInstanceRef.current.destroy();
    };
  }, [
    selectedMetric,
    selectedTimeRange,
    dateOffset,
    startDate,
    endDate,
    isCustomDateRangeActive,
    fullHistoricalData,
    currentIntervalDates,
    subTypes,
  ]);

  useEffect(() => {
    if (
      !doughnutChartRef.current ||
      fullHistoricalData.length === 0 ||
      subTypes.length === 0 ||
      currentIntervalDates.length === 0
    ) {
      if (doughnutChartInstanceRef.current)
        doughnutChartInstanceRef.current.destroy();
      doughnutChartInstanceRef.current = null;
      if (doughnutChartRef.current) {
        const context = doughnutChartRef.current.getContext("2d");
        if (context)
          context.clearRect(
            0,
            0,
            doughnutChartRef.current.width,
            doughnutChartRef.current.height
          );
      }
      return;
    }
    const ctx = doughnutChartRef.current.getContext("2d");
    if (!ctx) return;
    if (doughnutChartInstanceRef.current)
      doughnutChartInstanceRef.current.destroy();

    const metricKey = metricToKeyMap[selectedMetric];
    const aggregatedData: Record<string, number> = {};
    subTypes.forEach((subType) => (aggregatedData[subType] = 0));

    currentIntervalDates.forEach((date) => {
      const dataPoint = fullHistoricalData.find((fD) =>
        isSameDay(fD.date, date)
      );
      if (dataPoint && dataPoint[metricKey] && dataPoint[metricKey].breakdown) {
        dataPoint[metricKey].breakdown.forEach((breakdownItem) => {
          if (aggregatedData.hasOwnProperty(breakdownItem.name)) {
            aggregatedData[breakdownItem.name] += breakdownItem.value;
          }
        });
      }
    });

    const doughnutLabels = subTypes;
    const doughnutDataValues = subTypes.map((subType) =>
      parseFloat(aggregatedData[subType].toFixed(2))
    );
    const totalForPeriod = doughnutDataValues.reduce(
      (sum, value) => sum + value,
      0
    );

    if (
      Math.abs(totalForPeriod) < 0.01 &&
      doughnutDataValues.every((val) => Math.abs(val) < 0.01)
    ) {
      if (doughnutChartInstanceRef.current)
        doughnutChartInstanceRef.current.destroy();
      doughnutChartInstanceRef.current = null;
      const context = doughnutChartRef.current.getContext("2d");
      if (context)
        context.clearRect(
          0,
          0,
          doughnutChartRef.current.width,
          doughnutChartRef.current.height
        );
      return;
    }

    const isDarkMode = document.documentElement.classList.contains("dark");
    const doughnutChartTitle = `${selectedMetric} Breakdown by Occupation`;
    let periodLabelForCenter = "";
    if (isCustomDateRangeActive && startDate && endDate) {
      periodLabelForCenter = `(${format(startDate, "MMM d")} - ${format(
        endDate,
        "MMM d"
      )})`;
    } else {
      if (selectedTimeRange === "Weekly" || selectedTimeRange === "Monthly") {
        if (currentIntervalDates.length > 0) {
          const firstDate = currentIntervalDates[0];
          const lastDate =
            currentIntervalDates[currentIntervalDates.length - 1];
          periodLabelForCenter =
            selectedTimeRange === "Weekly"
              ? `(${format(firstDate, "MMM d")} - ${format(lastDate, "MMM d")})`
              : `(${format(firstDate, "MMMM yyyy")})`;
        } else {
          periodLabelForCenter = `(${selectedTimeRange})`;
        }
      } else {
        periodLabelForCenter = `(${selectedTimeRange})`;
      }
    }

    const doughnutChartData: ChartData<"doughnut"> = {
      labels: doughnutLabels,
      datasets: [
        {
          label: selectedMetric,
          data: doughnutDataValues,
          backgroundColor: DOUGHNUT_CHART_COLORS.slice(0, subTypes.length).map(
            (color) => color.replace("0.9", "0.8")
          ),
          borderColor: isDarkMode ? "#4A5568" : "#FFF",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };

    const doughnutChartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDarkMode ? "#D1D5DB" : "#4B5563",
            padding: 15,
            boxWidth: 12,
            font: { size: 10 },
          },
        },
        title: {
          display: true,
          text: doughnutChartTitle,
          font: { size: 14 },
          color: isDarkMode ? "#FFF" : "#374151",
          padding: { bottom: 10 },
        },
        tooltip: {
          callbacks: {
            label: (context: import("chart.js").TooltipItem<"doughnut">) => {
              let label = context.label || "";
              if (label) label += ": ";
              if (context.parsed !== null) {
                label += formatCurrency(context.parsed);
                if (totalForPeriod !== 0) {
                  const percentage = (
                    (context.parsed / totalForPeriod) *
                    100
                  ).toFixed(1);
                  label += ` (${percentage}%)`;
                }
              }
              return label;
            },
          },
        },
        centerText: {
          defaultColor: isDarkMode ? "#E5E7EB" : "#1F2937",
          defaultFontStyle: "normal",
          defaultFontSize: 12,
          defaultFontFamily: "sans-serif",
          textLines: [
            {
              text: formatCurrency(totalForPeriod),
              fontSize: 18,
              fontFamily: "Inter, sans-serif",
            },
            {
              text: periodLabelForCenter,
              fontSize: 10,
              fontFamily: "Inter, sans-serif",
            },
          ],
        } as CenterTextPluginOptions,
      },
    };
    doughnutChartInstanceRef.current = new ChartJS(ctx, {
      type: "doughnut",
      data: doughnutChartData,
      options: doughnutChartOptions,
      plugins: [centerTextPlugin],
    });
    return () => {
      if (doughnutChartInstanceRef.current)
        doughnutChartInstanceRef.current.destroy();
    };
  }, [
    selectedMetric,
    fullHistoricalData,
    subTypes,
    currentIntervalDates,
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
  ]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      [lineChartInstanceRef.current, doughnutChartInstanceRef.current].forEach(
        (chartInstance) => {
          if (
            !chartInstance ||
            !chartInstance.options ||
            !chartInstance.options.plugins
          )
            return;
          const isDarkMode =
            document.documentElement.classList.contains("dark");

          const chartTitlePlugin = chartInstance.options.plugins.title;
          if (chartTitlePlugin)
            chartTitlePlugin.color = isDarkMode ? "#FFF" : "#374151";

          if (
            chartInstance.options.plugins.legend &&
            chartInstance.options.plugins.legend.labels
          )
            chartInstance.options.plugins.legend.labels.color = isDarkMode
              ? "#D1D5DB"
              : "#4B5563";

          if (
            chartInstance.options.plugins &&
            (chartInstance.options.plugins as any).centerText
          ) {
            (
              (chartInstance.options.plugins as any)
                .centerText as CenterTextPluginOptions
            ).defaultColor = isDarkMode ? "#E5E7EB" : "#1F2937";
          }

          if (
            (chartInstance.config as any).type === "line" &&
            chartInstance.options.scales
          ) {
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
          }

          if (
            (chartInstance.config as any).type === "doughnut" &&
            chartInstance.data.datasets[0]
          )
            chartInstance.data.datasets[0].borderColor = isDarkMode
              ? "#4A5568"
              : "#FFF";

          chartInstance.update("none");
        }
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);
  const showTimeNavControls =
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
          Financial Trends
        </h3>
        <p className="text-sm text-dark dark:text-light mb-4 text-center sm:text-left">
          Select a metric and time range, or specify a custom date range.
        </p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start gap-3 sm:gap-4 my-4">
          <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
            <DropdownSmall
              label="Financial Metric"
              items={FINANCIAL_METRICS.slice()}
              selected={selectedMetric}
              onSelect={(item) => setSelectedMetric(item as FinancialMetric)}
              placeholder="Select Metric"
            />
          </div>
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
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 w-full">
          <div className="relative h-72 sm:h-80 md:h-96">
            <canvas ref={lineChartRef}></canvas>
          </div>
          {showTimeNavControls && (
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
        <div className="lg:w-1/3 w-full mt-6 lg:mt-0">
          {subTypes.length > 0 ? (
            <div className="relative h-72 sm:h-80 md:h-96 flex flex-col">
              <canvas ref={doughnutChartRef}></canvas>
            </div>
          ) : (
            !isLoadingData && (
              <div className="h-72 sm:h-80 md:h-96 flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                  <p className="text-sm">
                    No farm types configured for breakdown.
                  </p>
                  <p className="text-xs mt-1">
                    Configure in settings to see detailed chart.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
export default TrendGraph;
