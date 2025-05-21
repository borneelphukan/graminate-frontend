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
import { DailyFinancialEntry } from "@/pages/platform/[user_id]/finance";

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

const METRIC_COLORS: Record<FinancialMetric, { line: string; area: string }> = {
  Revenue: { line: "rgb(34, 197, 94)", area: "rgba(34, 197, 94, 0.2)" },
  COGS: { line: "rgb(234, 179, 8)", area: "rgba(234, 179, 8, 0.2)" },
  "Gross Profit": { line: "rgb(6, 182, 212)", area: "rgba(6, 182, 212, 0.2)" },
  Expenses: { line: "rgb(239, 68, 68)", area: "rgba(239, 68, 68, 0.2)" },
  "Net Profit": { line: "rgb(59, 130, 246)", area: "rgba(59, 130, 246, 0.2)" },
};

const DOUGHNUT_CHART_COLORS = [
  "rgba(75, 192, 192, 0.8)",
  "rgba(255, 159, 64, 0.8)",
  "rgba(153, 102, 255, 0.8)",
  "rgba(255, 99, 132, 0.8)",
  "rgba(54, 162, 235, 0.8)",
  "rgba(255, 206, 86, 0.8)",
  "rgba(128,128,128, 0.8)",
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
    // Line Chart
    if (!lineChartRef.current || fullHistoricalData.length === 0) return;
    const ctx = lineChartRef.current.getContext("2d");
    if (!ctx) return;
    if (lineChartInstanceRef.current) lineChartInstanceRef.current.destroy();
    let dL: string[] = [],
      dV: (number | null)[] = [],
      pRV = 3,
      xAST = "";
    if (isCustomDateRangeActive && startDate && endDate) {
      xAST = `Range: ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    } else {
      if (selectedTimeRange === "Weekly") {
        const vS = currentIntervalDates[0],
          vE = currentIntervalDates[currentIntervalDates.length - 1];
        xAST = `Week: ${format(vS, "MMM d")} - ${format(vE, "MMM d, yyyy")}`;
      } else if (selectedTimeRange === "Monthly") {
        const vS = currentIntervalDates[0];
        xAST = `Month: ${format(vS, "MMMM yyyy")}`;
      } else {
        const vS = currentIntervalDates[0],
          vE = currentIntervalDates[currentIntervalDates.length - 1];
        xAST = `Last 3 Months (${format(vS, "MMM yyyy")} - ${format(
          vE,
          "MMM yyyy"
        )})`;
        pRV = 1.5;
      }
    }
    currentIntervalDates.forEach((d) => {
      const dP = fullHistoricalData.find((fD) => isSameDay(fD.date, d));
      const mK = metricToKeyMap[selectedMetric];
      if (dP && dP[mK]) {
        if (
          isCustomDateRangeActive ||
          isBefore(d, addDaysDateFns(today, 1)) ||
          isSameDay(d, today)
        )
          dV.push(dP[mK].total);
        else dV.push(null);
      } else dV.push(null);
      dL.push(
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
    if (!isCustomDateRangeActive && selectedTimeRange === "3 Months") pRV = 1.5;
    else if (currentIntervalDates.length > 60 && isCustomDateRangeActive)
      pRV = 1;
    else pRV = 3;
    const iDM = document.documentElement.classList.contains("dark");
    const cTT = `${selectedMetric} Trend - ${
      isCustomDateRangeActive ? "Custom Range" : selectedTimeRange
    }`;
    const yALT = `Amount (INR)`;
    const cC = METRIC_COLORS[selectedMetric];
    const data: ChartData<"line"> = {
      labels: dL,
      datasets: [
        {
          label: selectedMetric,
          data: dV,
          borderColor: cC.line,
          backgroundColor: cC.area,
          tension: 0.2,
          fill: true,
          pointBackgroundColor: cC.line,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: cC.line,
          pointRadius: pRV,
          pointHoverRadius: pRV + 2,
          spanGaps: true,
        },
      ],
    };
    let mT;
    if (isCustomDateRangeActive) {
      if (currentIntervalDates.length <= 7) mT = currentIntervalDates.length;
      else if (currentIntervalDates.length <= 31)
        mT = Math.ceil(
          currentIntervalDates.length /
            (currentIntervalDates.length > 15 ? 2 : 1)
        );
      else mT = 15;
    } else {
      if (selectedTimeRange === "Weekly") mT = 7;
      else if (selectedTimeRange === "Monthly")
        mT =
          currentIntervalDates.length > 15 ? 15 : currentIntervalDates.length;
      else mT = 12;
    }
    const opts: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: cTT,
          font: { size: 16 },
          color: iDM ? "#FFF" : "#374151",
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
            text: xAST,
            color: iDM ? "#9CA3AF" : "#6B7280",
          },
          grid: { color: iDM ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
          ticks: {
            color: iDM ? "#D1D5DB" : "#4B5563",
            autoSkip: true,
            maxTicksLimit: mT,
          },
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: yALT,
            color: iDM ? "#9CA3AF" : "#6B7280",
          },
          grid: { color: iDM ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
          ticks: {
            color: iDM ? "#D1D5DB" : "#4B5563",
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
      },
    };
    lineChartInstanceRef.current = new ChartJS(ctx, {
      type: "line",
      data,
      options: opts,
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
  ]);

  useEffect(() => {
    // Doughnut Chart
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
        const c = doughnutChartRef.current.getContext("2d");
        if (c)
          c.clearRect(
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
    const mK = metricToKeyMap[selectedMetric];
    const aggD: Record<string, number> = {};
    subTypes.forEach((sT) => (aggD[sT] = 0));
    currentIntervalDates.forEach((d) => {
      const dP = fullHistoricalData.find((fD) => isSameDay(fD.date, d));
      if (dP && dP[mK] && dP[mK].breakdown) {
        dP[mK].breakdown.forEach((bD) => {
          if (aggD.hasOwnProperty(bD.name)) aggD[bD.name] += bD.value;
        });
      }
    });
    const dL = subTypes;
    const dDV = subTypes.map((sT) => parseFloat(aggD[sT].toFixed(2)));
    const tFP = dDV.reduce((s, v) => s + v, 0);
    if (Math.abs(tFP) < 0.01 && dDV.every((v) => Math.abs(v) < 0.01)) {
      if (doughnutChartInstanceRef.current)
        doughnutChartInstanceRef.current.destroy();
      doughnutChartInstanceRef.current = null;
      const c = doughnutChartRef.current.getContext("2d");
      if (c)
        c.clearRect(
          0,
          0,
          doughnutChartRef.current.width,
          doughnutChartRef.current.height
        );
      return;
    }
    const iDM = document.documentElement.classList.contains("dark");
    const dCT = `${selectedMetric} Breakdown by Occupation`;
    let pLFC = "";
    if (isCustomDateRangeActive && startDate && endDate) {
      pLFC = `(${format(startDate, "MMM d")} - ${format(endDate, "MMM d")})`;
    } else {
      if (selectedTimeRange === "Weekly" || selectedTimeRange === "Monthly") {
        if (currentIntervalDates.length > 0) {
          const fD = currentIntervalDates[0];
          const lD = currentIntervalDates[currentIntervalDates.length - 1];
          pLFC =
            selectedTimeRange === "Weekly"
              ? `(${format(fD, "MMM d")} - ${format(lD, "MMM d")})`
              : `(${format(fD, "MMMM yyyy")})`;
        } else {
          pLFC = `(${selectedTimeRange})`;
        }
      } else {
        pLFC = `(${selectedTimeRange})`;
      }
    }
    const data: ChartData<"doughnut"> = {
      labels: dL,
      datasets: [
        {
          label: selectedMetric,
          data: dDV,
          backgroundColor: DOUGHNUT_CHART_COLORS.slice(0, subTypes.length),
          borderColor: iDM ? "#4A5568" : "#FFF",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
    // Use 'any' to allow custom plugin options like 'centerText'
    const opts: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: iDM ? "#D1D5DB" : "#4B5563",
            padding: 15,
            boxWidth: 12,
            font: { size: 10 },
          },
        },
        title: {
          display: true,
          text: dCT,
          font: { size: 14 },
          color: iDM ? "#FFF" : "#374151",
          padding: { bottom: 10 },
        },
        tooltip: {
          callbacks: {
            label: (c: import("chart.js").TooltipItem<"doughnut">) => {
              let l = c.label || "";
              if (l) l += ": ";
              if (c.parsed !== null) {
                l += formatCurrency(c.parsed);
                if (tFP !== 0) {
                  const p = ((c.parsed / tFP) * 100).toFixed(1);
                  l += ` (${p}%)`;
                }
              }
              return l;
            },
          },
        },
        centerText: {
          defaultColor: iDM ? "#E5E7EB" : "#1F2937",
          defaultFontStyle: "normal",
          defaultFontSize: 12,
          defaultFontFamily: "sans-serif",
          textLines: [
            {
              text: formatCurrency(tFP),
              fontSize: 18,
              fontFamily: "Inter, sans-serif",
            },
            { text: pLFC, fontSize: 10, fontFamily: "Inter, sans-serif" },
          ],
        } as CenterTextPluginOptions,
      },
    };
    doughnutChartInstanceRef.current = new ChartJS(ctx, {
      type: "doughnut",
      data,
      options: opts,
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
    // Dark Mode Observer
    const o = new MutationObserver(() => {
      [lineChartInstanceRef.current, doughnutChartInstanceRef.current].forEach(
        (cI) => {
          if (!cI || !cI.options || !cI.options.plugins) return;
          const iDM = document.documentElement.classList.contains("dark");
          const cTP = cI.options.plugins.title;
          if (cTP) cTP.color = iDM ? "#FFF" : "#374151";
          if (cI.options.plugins.legend && cI.options.plugins.legend.labels)
            cI.options.plugins.legend.labels.color = iDM
              ? "#D1D5DB"
              : "#4B5563";
          if (cI.options.plugins && (cI.options.plugins as any).centerText) {
            (
              (cI.options.plugins as any).centerText as CenterTextPluginOptions
            ).defaultColor = iDM ? "#E5E7EB" : "#1F2937";
          }
          if ((cI.config as any).type === "line" && cI.options.scales) {
            const xS = cI.options.scales.x as CartesianScaleOptions | undefined;
            const yS = cI.options.scales.y as CartesianScaleOptions | undefined;
            if (xS) {
              if (xS.title) xS.title.color = iDM ? "#9CA3AF" : "#6B7280";
              if (xS.ticks) xS.ticks.color = iDM ? "#D1D5DB" : "#4B5563";
              if (xS.grid)
                xS.grid.color = iDM
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)";
            }
            if (yS) {
              if (yS.title) yS.title.color = iDM ? "#9CA3AF" : "#6B7280";
              if (yS.ticks) yS.ticks.color = iDM ? "#D1D5DB" : "#4B5563";
              if (yS.grid)
                yS.grid.color = iDM
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)";
            }
          }
          if ((cI.config as any).type === "doughnut" && cI.data.datasets[0])
            cI.data.datasets[0].borderColor = iDM ? "#4A5568" : "#FFF";
          cI.update("none");
        }
      );
    });
    o.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => o.disconnect();
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
              onSelect={(i) => setSelectedMetric(i as FinancialMetric)}
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
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 w-full">
          <div className="relative h-72 sm:h-80 md:h-96">
            <canvas ref={lineChartRef}></canvas>
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
