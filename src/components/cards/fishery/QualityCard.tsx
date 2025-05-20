import { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
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
  isSameMonth,
  isBefore,
  min as minDateFn,
  subDays as subDaysDateFns,
  addDays as addDaysDateFns,
  isValid as isValidDate,
} from "date-fns";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";

ChartJS.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ALL_QUALITY_PARAMETERS = [
  "Alkalinity",
  "Hardness",
  "Salinity",
  "Dissolved O2",
  "Ammonia",
  "pH Levels",
] as const;

type QualityParameter = (typeof ALL_QUALITY_PARAMETERS)[number];

const timeRangeOptions = ["Weekly", "Monthly", "3 Months"] as const;
type TimeRange = (typeof timeRangeOptions)[number];

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

const generateDailyData = (
  count: number
): { date: Date; values: Record<QualityParameter, number | null> }[] => {
  const data = [];
  let loopDate = subDaysDateFns(today, count - 1);

  for (let i = 0; i < count; i++) {
    const dayData: Record<string, number | null> = {};
    ALL_QUALITY_PARAMETERS.forEach((param) => {
      switch (param) {
        case "Alkalinity":
          dayData[param] = 120 + (Math.random() - 0.5) * 20;
          break;
        case "Hardness":
          dayData[param] = 200 + (Math.random() - 0.5) * 40;
          break;
        case "Salinity":
          dayData[param] = 15 + (Math.random() - 0.5) * 2;
          break;
        case "Dissolved O2":
          dayData[param] = 7 + (Math.random() - 0.5) * 1;
          break;
        case "Ammonia":
          dayData[param] = 0.1 + (Math.random() - 0.5) * 0.1;
          break;
        case "pH Levels":
          dayData[param] = 7 + (Math.random() - 0.5) * 2;
          break;
        default:
          dayData[param] = 0;
      }
      if (dayData[param] !== null) {
        if (param === "Ammonia")
          dayData[param] = Math.max(
            0.01,
            parseFloat((dayData[param] as number).toFixed(2))
          );
        else if (
          param === "Salinity" ||
          param === "Dissolved O2" ||
          param === "pH Levels"
        )
          dayData[param] = Math.max(
            0,
            parseFloat((dayData[param] as number).toFixed(1))
          );
        else
          dayData[param] = Math.max(
            0,
            parseFloat((dayData[param] as number).toFixed(0))
          );
      }
    });
    data.push({
      date: new Date(loopDate),
      values: dayData as Record<QualityParameter, number | null>,
    });
    loopDate = addDaysDateFns(loopDate, 1);
  }
  return data;
};

const fullHistoricalData = generateDailyData(TOTAL_DAYS_FOR_HISTORICAL_DATA);
const earliestDataPointDate = fullHistoricalData[0]?.date;

const parameterUnits: Record<
  QualityParameter,
  { units: readonly string[]; defaultUnit: string; yAxisLabelBase: string }
> = {
  Alkalinity: {
    units: ["ppm", "mg/L as CaCO₃", "meq/L"],
    defaultUnit: "ppm",
    yAxisLabelBase: "Alkalinity",
  },
  Hardness: {
    units: ["ppm", "mg/L as CaCO₃", "°dH"],
    defaultUnit: "ppm",
    yAxisLabelBase: "Hardness",
  },
  Salinity: {
    units: ["ppm", "ppt", "PSU"],
    defaultUnit: "ppm",
    yAxisLabelBase: "Salinity",
  },
  "Dissolved O2": {
    units: ["ppm", "mg/L", "% saturation"],
    defaultUnit: "ppm",
    yAxisLabelBase: "Dissolved Oxygen",
  },
  Ammonia: {
    units: ["ppm", "mg/L as NH₃-N", "mg/L as NH₃"],
    defaultUnit: "ppm",
    yAxisLabelBase: "Ammonia",
  },
  "pH Levels": { units: ["pH"], defaultUnit: "pH", yAxisLabelBase: "PH Value" },
};

const QualityCard = () => {
  const [selectedQuality, setSelectedQuality] = useState<QualityParameter>(
    ALL_QUALITY_PARAMETERS[0]
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    timeRangeOptions[0]
  );
  const [selectedUnit, setSelectedUnit] = useState<string>(
    parameterUnits[ALL_QUALITY_PARAMETERS[0]].defaultUnit
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    setSelectedUnit(parameterUnits[selectedQuality].defaultUnit);
  }, [selectedQuality]);

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange, selectedQuality, startDate, endDate]);

  const handleStartDateChange = (dateString: string) => {
    if (dateString) {
      const newDate = new Date(dateString);
      if (isValidDate(newDate)) {
        newDate.setHours(0, 0, 0, 0);
        setStartDate(newDate);
        if (endDate && isBefore(endDate, newDate)) {
          setEndDate(null);
        }
      } else {
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (dateString: string) => {
    if (dateString) {
      const newDate = new Date(dateString);
      if (isValidDate(newDate)) {
        newDate.setHours(23, 59, 59, 999);
        setEndDate(newDate);
        if (startDate && isBefore(newDate, startDate)) {
          setStartDate(null);
        }
      } else {
        setEndDate(null);
      }
    } else {
      setEndDate(null);
    }
  };

  const currentUnitOptions = useMemo(() => {
    return parameterUnits[selectedQuality].units;
  }, [selectedQuality]);

  const { isPrevDisabled, isNextDisabled } = useMemo(() => {
    const nextIsDisabled = dateOffset === 0;
    let prevIsDisabled = false;

    if (earliestDataPointDate && !startDate && !endDate) {
      if (selectedTimeRange === "Weekly") {
        const prevWeekStartDate = subDaysDateFns(
          addWeeks(today, dateOffset - 1),
          6
        );
        prevIsDisabled = isBefore(prevWeekStartDate, earliestDataPointDate);
      } else if (selectedTimeRange === "Monthly") {
        const prevMonthStartDate = startOfMonth(
          addMonths(today, dateOffset - 1)
        );
        prevIsDisabled = isBefore(prevMonthStartDate, earliestDataPointDate);
      }
    }
    return { isPrevDisabled: prevIsDisabled, isNextDisabled: nextIsDisabled };
  }, [dateOffset, selectedTimeRange, startDate, endDate]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        let dateLabels: string[] = [];
        let dataValues: (number | null)[] = [];
        let chartType: "line" | "bar" = "line";
        let pointRadiusValue = 3;
        let barColors: (string | undefined)[] | undefined = undefined;

        let viewStartDate: Date;
        let viewEndDate: Date;
        let xAxisTitleText: string = "";
        let intervalDates: Date[] = [];

        const isCustomDateRange =
          startDate &&
          endDate &&
          isValidDate(startDate) &&
          isValidDate(endDate) &&
          !isBefore(endDate, startDate);

        if (isCustomDateRange) {
          viewStartDate = startDate;
          viewEndDate = endDate;
          intervalDates = eachDayOfInterval({
            start: viewStartDate,
            end: viewEndDate,
          });
          xAxisTitleText = `Range: ${format(
            viewStartDate,
            "MMM d, yyyy"
          )} - ${format(viewEndDate, "MMM d, yyyy")}`;
        } else {
          const referenceDate = today;
          if (selectedTimeRange === "Weekly") {
            const targetDate = addWeeks(referenceDate, dateOffset);
            viewEndDate = targetDate;
            viewStartDate = subDaysDateFns(targetDate, 6);
            intervalDates = eachDayOfInterval({
              start: viewStartDate,
              end: viewEndDate,
            });
            xAxisTitleText = `Week: ${format(
              viewStartDate,
              "MMM d"
            )} - ${format(viewEndDate, "MMM d, yyyy")}`;
          } else if (selectedTimeRange === "Monthly") {
            const targetMonthDate = addMonths(referenceDate, dateOffset);
            viewStartDate = startOfMonth(targetMonthDate);
            viewEndDate = endOfMonth(targetMonthDate);
            intervalDates = eachDayOfInterval({
              start: viewStartDate,
              end: viewEndDate,
            });
            xAxisTitleText = `Month: ${format(viewStartDate, "MMMM yyyy")}`;
          } else {
            viewStartDate = startOfMonth(subMonths(referenceDate, 2));
            viewEndDate = minDateFn([referenceDate, endOfMonth(referenceDate)]);
            intervalDates = eachDayOfInterval({
              start: viewStartDate,
              end: viewEndDate,
            });
            xAxisTitleText = `Last 3 Months (${format(
              viewStartDate,
              "MMM yyyy"
            )} - ${format(endOfMonth(referenceDate), "MMM yyyy")})`;
          }
        }

        intervalDates.forEach((day) => {
          const dataPoint = fullHistoricalData.find((d) =>
            isSameDay(d.date, day)
          );
          if (isCustomDateRange) {
            if (dataPoint && dataPoint.values[selectedQuality] !== undefined) {
              dataValues.push(dataPoint.values[selectedQuality]);
            } else {
              dataValues.push(null);
            }
          } else {
            if (dataPoint && dataPoint.values[selectedQuality] !== undefined) {
              if (
                isBefore(day, addDaysDateFns(today, 1)) ||
                isSameDay(day, today) ||
                (isSameMonth(day, today) &&
                  selectedTimeRange === "Monthly" &&
                  dateOffset === 0)
              ) {
                dataValues.push(dataPoint.values[selectedQuality]);
              } else {
                dataValues.push(null);
              }
            } else if (
              isBefore(today, day) &&
              selectedTimeRange === "Monthly" &&
              isSameMonth(day, addMonths(today, dateOffset))
            ) {
              dataValues.push(null);
            } else {
              dataValues.push(null);
            }
          }
          dateLabels.push(
            format(
              day,
              isCustomDateRange
                ? "MMM d"
                : selectedTimeRange === "Weekly" ||
                  selectedTimeRange === "Monthly"
                ? "EEE d"
                : "MMM d"
            )
          );
        });

        if (selectedQuality === "pH Levels") {
          chartType = "bar";
          barColors = dataValues.map((ph) => {
            if (ph === null) return "rgba(200, 200, 200, 0.1)";
            if (ph < 6.5) return "rgba(255, 99, 132, 0.7)";
            if (ph > 7.5) return "rgba(255, 206, 86, 0.7)";
            return "rgba(75, 192, 192, 0.7)";
          });
        }

        if (
          !isCustomDateRange &&
          selectedTimeRange === "3 Months" &&
          chartType === "line"
        ) {
          pointRadiusValue = 1.5;
        } else if (chartType === "line") {
          pointRadiusValue = 3;
        }

        const isDarkMode = document.documentElement.classList.contains("dark");
        const chartTitleText = `${selectedQuality} (${selectedUnit}) - ${
          isCustomDateRange ? "Custom Range" : selectedTimeRange
        }`;
        const yAxisLabelText = `${parameterUnits[selectedQuality].yAxisLabelBase} (${selectedUnit})`;

        const data: ChartData<typeof chartType> = {
          labels: dateLabels,
          datasets: [
            {
              label: selectedQuality,
              data: dataValues,
              borderColor:
                chartType === "line" ? "rgb(59, 130, 246)" : undefined,
              backgroundColor:
                chartType === "line" ? "rgba(59, 130, 246, 0.2)" : barColors,
              tension: chartType === "line" ? 0.2 : undefined,
              fill: chartType === "line" ? true : undefined,
              pointBackgroundColor:
                chartType === "line" ? "rgb(59, 130, 246)" : undefined,
              pointBorderColor: chartType === "line" ? "#fff" : undefined,
              pointHoverBackgroundColor:
                chartType === "line" ? "#fff" : undefined,
              pointHoverBorderColor:
                chartType === "line" ? "rgb(59, 130, 246)" : undefined,
              pointRadius: chartType === "line" ? pointRadiusValue : undefined,
              pointHoverRadius:
                chartType === "line" ? pointRadiusValue + 2 : undefined,
              borderWidth: chartType === "bar" ? 1 : undefined,
              spanGaps: true,
            } as any,
          ],
        };

        let maxTicks;
        if (isCustomDateRange) {
          if (intervalDates.length <= 7) maxTicks = intervalDates.length;
          else if (intervalDates.length <= 31)
            maxTicks = Math.ceil(intervalDates.length / 2);
          else maxTicks = 15;
        } else {
          if (selectedTimeRange === "Weekly") maxTicks = 7;
          else if (selectedTimeRange === "Monthly")
            maxTicks = intervalDates.length > 15 ? 15 : intervalDates.length;
          else maxTicks = 12; // 3 Months
        }

        const options: ChartOptions<typeof chartType> = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: chartTitleText,
              font: { size: 16 },
              color: isDarkMode ? "#FFFFFF" : "#374151",
            },
            tooltip: { enabled: true, mode: "index", intersect: false },
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
              beginAtZero: selectedQuality !== "pH Levels",
              min: selectedQuality === "pH Levels" ? 0 : undefined,
              max: selectedQuality === "pH Levels" ? 14 : undefined,
              title: {
                display: true,
                text: yAxisLabelText,
                color: isDarkMode ? "#9CA3AF" : "#6B7280",
              },
              grid: {
                color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              },
              ticks: { color: isDarkMode ? "#D1D5DB" : "#4B5563" },
            },
          },
        };

        chartInstanceRef.current = new ChartJS(ctx, {
          type: chartType,
          data: data,
          options: options,
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [
    selectedQuality,
    selectedTimeRange,
    selectedUnit,
    dateOffset,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chart = chartInstanceRef.current;
      if (
        !chart ||
        !chart.options ||
        !chart.options.scales ||
        !chart.options.plugins
      )
        return;
      const isDarkMode = document.documentElement.classList.contains("dark");
      const xScale = chart.options.scales.x as
        | CartesianScaleOptions
        | undefined;
      const yScale = chart.options.scales.y as
        | CartesianScaleOptions
        | undefined;
      const chartTitlePlugin = chart.options.plugins.title;
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
      if (chartTitlePlugin)
        chartTitlePlugin.color = isDarkMode ? "#FFFFFF" : "#374151";
      chart.update("none");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);

  const showTimeRangeDropdown =
    !startDate ||
    !endDate ||
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    isBefore(endDate, startDate);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 text-center sm:text-left">
          Water Quality Analysis
        </h3>
        <p className="text-sm text-dark dark:text-light mb-4 text-center sm:text-left">
          Select a parameter, unit, and time range or date range to view trends.
        </p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
          {ALL_QUALITY_PARAMETERS.map((param) => (
            <button
              key={param}
              onClick={() => setSelectedQuality(param)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full shadow-sm transition-all duration-150 ease-in-out ${
                selectedQuality === param
                  ? "bg-blue-200 text-white hover:bg-blue-100"
                  : "bg-gray-500 dark:bg-gray-600 text-dark dark:text-light hover:bg-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {param}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start gap-3 sm:gap-4 mb-4">
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
              width="large"
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
              width="large"
            />
          </div>
          {showTimeRangeDropdown && (
            <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
              <DropdownSmall
                label="Time Range"
                items={timeRangeOptions.slice()}
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
          {selectedQuality !== "pH Levels" && (
            <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
              <DropdownSmall
                label="Unit"
                items={currentUnitOptions.slice()}
                selected={selectedUnit}
                onSelect={(item) => setSelectedUnit(item)}
                placeholder="Select Unit"
              />
            </div>
          )}
        </div>
      </div>
      <div className="relative h-72 sm:h-80 md:h-96">
        <canvas ref={chartRef}></canvas>
      </div>
      {showTimeRangeDropdown &&
        (selectedTimeRange === "Weekly" || selectedTimeRange === "Monthly") && (
          <div className="flex justify-center items-center gap-x-3 my-3">
            <Button
              text="Prev"
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

export default QualityCard;
