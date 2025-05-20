import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun } from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
import type { ChartConfiguration, Chart as ChartJS } from "chart.js";
import UVScale from "./UVScale";
import { Coordinates } from "@/types/card-props";
import axios from "axios";
import Loader from "@/components/ui/Loader";
import { useDisplayMode, useWeatherData } from "@/hooks/weather";

type UVHourly = { time: Date; uv: number };
type DailyData = {
  time: Date[];
  uvIndexMax: number[];
  uvIndexMin: number[];
  daylightDuration: number[];
};

type HourlyData = {
  time: Date[];
  uvIndexHourly: number[];
};

type WeatherData = {
  daily: DailyData;
  hourly: HourlyData;
};

const UVCard = ({ lat, lon }: Coordinates) => {
  const [lowestRiskLevel, setLowestRiskLevel] = useState<string>("");
  const [highestRiskLevel, setHighestRiskLevel] = useState<string>("");
  const [uvIndexToday, setUvIndexToday] = useState<number | null>(null);
  const [hourlyUVDataByDay, setHourlyUVDataByDay] = useState<
    { day: Date; uvHours: UVHourly[] }[]
  >([]);
  const { displayMode, dropdownOpen, toggleDropdown, selectDisplayMode } =
    useDisplayMode<"Small" | "Large">({ initialMode: "Small" });

  const fetchUVApiData = useCallback(
    async (
      latitude: number,
      longitude: number
    ): Promise<WeatherData | null> => {
      const response = await axios.get("/api/weather", {
        params: {
          lat: latitude,
          lon: longitude,
        },
      });
      const rawData = response.data;
      if (!rawData || !rawData.daily || !rawData.hourly) {
        return null;
      }
      return {
        daily: {
          ...rawData.daily,
          time: rawData.daily.time.map((d: string) => new Date(d)),
        },
        hourly: {
          ...rawData.hourly,
          time: rawData.hourly.time.map((d: string) => new Date(d)),
        },
      };
    },
    []
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHourlyData, setSelectedHourlyData] = useState<
    { day: Date; uvHours: UVHourly[] } | undefined
  >(undefined);
  const [hoveredTime, setHoveredTime] = useState<string>("");
  const [hoveredUV, setHoveredUV] = useState<number>(0);
  const [hoveredRisk, setHoveredRisk] = useState<string>("");

  const chartCanvas = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const {
    data: weatherData,
    isLoading: isWeatherLoading,
    error: weatherError,
  } = useWeatherData<WeatherData>({
    fetchFunction: fetchUVApiData,
    lat,
    lon,
  });

  function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function calculateSunriseSunset(daylightSeconds: number): {
    sunrise: string;
    sunset: string;
  } {
    const daylightHours = daylightSeconds / 3600;
    const halfDaylight = daylightHours / 2;
    const solarNoon = 12 * 60;
    const sunriseMinutes = solarNoon - halfDaylight * 60;
    const sunsetMinutes = solarNoon + halfDaylight * 60;
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}:${mins.toString().padStart(2, "0")}`;
    };
    return {
      sunrise: formatTime(sunriseMinutes),
      sunset: formatTime(sunsetMinutes),
    };
  }

  function getUVRiskLevel(uv: number): { label: string; color: string } {
    const roundedUV = Math.round(uv);
    if (roundedUV <= 2) return { label: "Low", color: "green" };
    if (roundedUV >= 3 && roundedUV <= 5)
      return { label: "Moderate", color: "yellow" };
    if (roundedUV >= 6 && roundedUV <= 7)
      return { label: "High", color: "orange" };
    if (roundedUV >= 8 && roundedUV <= 10)
      return { label: "Very High", color: "red" };
    return { label: "Extreme", color: "purple" };
  }
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: new Date(d),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      day: d.toLocaleDateString(undefined, { day: "numeric" }),
    };
  });

  useEffect(() => {
    if (weatherData && displayMode === "Small") {
      const today = new Date().toISOString().split("T")[0];
      let startIndex = weatherData.daily.time.findIndex(
        (d: Date) => d.toISOString().split("T")[0] >= today
      );
      if (startIndex === -1) startIndex = 0;

      const maxUV = weatherData.daily.uvIndexMax?.[startIndex] ?? 0;
      const minUV = weatherData.daily.uvIndexMin?.[startIndex] ?? maxUV;

      const hourlyTimes = weatherData.hourly.time;
      const hourlyUVs = weatherData.hourly.uvIndexHourly;

      const now = new Date();
      let closestUV = 0;

      const todayHourlyData = hourlyTimes
        .map((time, index) => ({ time, uv: hourlyUVs[index] }))
        .filter((data) => data.time.toDateString() === now.toDateString());

      if (todayHourlyData.length > 0) {
        let closestTimeDiff = Infinity;
        let currentUV = 0;
        todayHourlyData.forEach((data) => {
          const timeDiff = Math.abs(now.getTime() - data.time.getTime());
          if (timeDiff < closestTimeDiff) {
            closestTimeDiff = timeDiff;
            currentUV = data.uv;
          }
        });

        if (closestTimeDiff < 60 * 60 * 1000) {
          closestUV = currentUV;
        } else {
          const daylightSeconds =
            weatherData.daily.daylightDuration?.[startIndex] ?? 0;
          const { sunrise, sunset } = calculateSunriseSunset(daylightSeconds);
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const sunriseMins = parseTimeToMinutes(sunrise);
          const sunsetMins = parseTimeToMinutes(sunset);
          closestUV =
            nowMinutes >= sunriseMins && nowMinutes <= sunsetMins ? 0 : 0;
        }
      }

      setUvIndexToday(closestUV < 0 ? 0 : closestUV);
      setLowestRiskLevel(getUVRiskLevel(minUV).label);
      setHighestRiskLevel(getUVRiskLevel(maxUV).label);
    }
  }, [weatherData, displayMode]);

  useEffect(() => {
    if (weatherData) {
      const uvData = weatherData.daily.time.map((day: Date) => {
        const uvHours: UVHourly[] = weatherData.hourly.time
          .map((hour: Date, idx: number) => {
            if (hour.toDateString() === day.toDateString()) {
              const uvValue = weatherData.hourly.uvIndexHourly[idx];
              return {
                time: hour,
                uv: uvValue < 0 ? 0 : uvValue,
              };
            }
            return null;
          })
          .filter((x): x is UVHourly => x !== null && x.uv > 0);
        return { day, uvHours };
      });
      setHourlyUVDataByDay(uvData);
    }
  }, [weatherData]);

  useEffect(() => {
    if (weatherData && displayMode === "Large" && !selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstAvailableDate =
        weatherData.daily.time.find((d: Date) => {
          const dateOnly = new Date(d);
          dateOnly.setHours(0, 0, 0, 0);
          return dateOnly >= today;
        }) ||
        weatherData.daily.time[0] ||
        new Date();
      setSelectedDate(firstAvailableDate);
    }
  }, [weatherData, displayMode, selectedDate]);

  useEffect(() => {
    if (selectedDate && hourlyUVDataByDay.length > 0) {
      const sel = hourlyUVDataByDay.find(
        (dayData) => dayData.day.toDateString() === selectedDate.toDateString()
      );
      setSelectedHourlyData(sel || { day: selectedDate, uvHours: [] });
    }
  }, [selectedDate, hourlyUVDataByDay]);

  useEffect(() => {
    if (selectedHourlyData && selectedHourlyData.uvHours.length > 0) {
      const uvValues = selectedHourlyData.uvHours.map((pt) => pt.uv);
      const minUV = Math.min(...uvValues);
      const maxUV = Math.max(...uvValues);
      setLowestRiskLevel(getUVRiskLevel(minUV).label);
      setHighestRiskLevel(getUVRiskLevel(maxUV).label);
    } else if (selectedHourlyData && selectedHourlyData.uvHours.length === 0) {
      setLowestRiskLevel("Low");
      setHighestRiskLevel("Low");
    }
  }, [selectedHourlyData]);

  useEffect(() => {
    if (displayMode === "Large" && selectedHourlyData && chartCanvas.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      if (selectedHourlyData.uvHours.length === 0) {
        return;
      }

      const labels = selectedHourlyData.uvHours.map((pt) =>
        pt.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      const dataValues = selectedHourlyData.uvHours.map((pt) => pt.uv);

      const verticalLinePlugin = {
        id: "verticalLinePlugin",
        afterDatasetsDraw: (chart: ChartJS) => {
          const activeElements = chart.tooltip?.getActiveElements();
          if (activeElements && activeElements.length > 0) {
            const activePoint = activeElements[0];
            if (activePoint) {
              const ctx = chart.ctx;
              const x = activePoint.element.x;
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, chart.chartArea.top);
              ctx.lineTo(x, chart.chartArea.bottom);
              ctx.lineWidth = 1;
              ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.restore();
            }
          }
        },
      };

      const chartConfig: ChartConfiguration<"line"> = {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "UV Index",
              data: dataValues,
              borderColor: "#04AD79",
              backgroundColor: "rgba(4, 173, 121, 0.1)",
              borderWidth: 2,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 5,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              enabled: true,
              mode: "index",
              intersect: false,
              displayColors: false,
              callbacks: {
                title: () => "",
                label: function (context) {
                  const uv = context.parsed.y;
                  setHoveredUV(uv);
                  setHoveredTime(context.label);
                  setHoveredRisk(getUVRiskLevel(uv).label);
                  return "";
                },
              },
            },
            legend: {
              display: false,
            },
          },
          hover: {
            mode: "index",
            intersect: false,
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                display: true,
                autoSkip: true,
                maxTicksLimit: 6,
                font: { size: 10 },
              },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              min: 0,
              max: Math.max(11, ...dataValues) + 1,
              grid: {
                drawTicks: false,
                color: "rgba(200, 200, 200, 0.2)",
              },
              ticks: {
                stepSize: 2,
                padding: 5,
                font: { size: 10 },
              },
              border: { display: false },
            },
          },
        },
        plugins: [verticalLinePlugin],
      };
      chartRef.current = new Chart(chartCanvas.current, chartConfig);
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [displayMode, selectedHourlyData]);

  return (
    <div className="p-4 rounded-lg shadow-md max-w-sm mx-auto flex flex-col items-center relative dark:bg-gray-700 bg-gray-500">
      <div className="absolute top-2 right-2 z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6 cursor-pointer text-dark dark:text-light"
          onClick={toggleDropdown}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggleDropdown();
              e.preventDefault();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Toggle dropdown"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 12a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM12.75 12a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM18.75 12a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"
          />
        </svg>

        {dropdownOpen && (
          <div className="absolute top-8 right-0 bg-white dark:bg-gray-600 dark:text-light text-black rounded-lg shadow-lg z-20 w-32">
            <button
              className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-800 rounded-t-lg cursor-pointer"
              type="button"
              onClick={() => selectDisplayMode("Small")}
            >
              Small
            </button>
            <button
              className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-800 rounded-b-lg cursor-pointer"
              type="button"
              onClick={() => selectDisplayMode("Large")}
            >
              Large
            </button>
          </div>
        )}
      </div>
      {weatherError ? (
        <p className="text-red-500 text-center py-10">Error: {weatherError}</p>
      ) : isWeatherLoading ? (
        <div className="text-center py-10 text-dark dark:text-light">
          <Loader />
        </div>
      ) : weatherData ? (
        <>
          {displayMode === "Small" && uvIndexToday !== null && (
            <div className={`w-full ${displayMode === "Small" ? "pb-1" : ""}`}>
              <div className="flex flex-col items-left w-full p-1 text-center rounded-md">
                <div className="w-full flex flex-row items-center gap-2">
                  <FontAwesomeIcon
                    icon={faSun}
                    className="w-4 h-4 text-yellow-200"
                  />
                  <p className="text-sm uppercase tracking-wide text-gray-200 dark:text-light">
                    UV Index
                  </p>
                </div>
                <p className="text-2xl py-2 text-left text-dark dark:text-gray-300">
                  {Math.round(uvIndexToday)}
                </p>
                <p className="text-sm dark:text-light text-dark text-left">
                  {getUVRiskLevel(Math.round(uvIndexToday)).label}
                </p>
                <UVScale uvIndex={uvIndexToday} />
                {lowestRiskLevel === highestRiskLevel ? (
                  <p className="text-xs text-dark dark:text-light mt-1">
                    UV index {lowestRiskLevel} today
                  </p>
                ) : (
                  <p className="text-xs text-dark dark:text-light mt-1">
                    UV index {lowestRiskLevel} to {highestRiskLevel} today
                  </p>
                )}
              </div>
            </div>
          )}

          {displayMode === "Large" && (
            <div className="w-full flex flex-col">
              <div className="flex flex-row justify-center items-center gap-2 mb-2">
                <FontAwesomeIcon
                  icon={faSun}
                  className="w-5 h-5 text-yellow-200"
                />
                <p className="text-sm uppercase tracking-wide text-gray-200 dark:text-light">
                  UV Index
                </p>
              </div>

              <div className="text-center text-gray-200 dark:text-light my-2 pt-2 flex justify-around">
                {weekDates.map((dateItem, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-xs font-semibold">
                      {dateItem.weekday}
                    </span>
                    <button
                      type="button"
                      className={`mt-1 flex flex-col items-center cursor-pointer px-2 py-1 rounded-full ${
                        selectedDate &&
                        dateItem.date.toDateString() ===
                          selectedDate.toDateString()
                          ? "bg-green-200 text-white"
                          : "hover:bg-gray-400 dark:hover:bg-gray-300"
                      }`}
                      onClick={() => setSelectedDate(dateItem.date)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedDate(dateItem.date);
                        }
                      }}
                      tabIndex={0}
                      aria-pressed={
                        selectedDate &&
                        dateItem.date.toDateString() ===
                          selectedDate.toDateString()
                          ? true
                          : false
                      }
                      aria-label={`Select UV data for ${dateItem.weekday}, ${dateItem.day}`}
                    >
                      <span className="text-sm">{dateItem.day}</span>
                    </button>
                  </div>
                ))}
              </div>

              {selectedHourlyData && selectedHourlyData.uvHours.length > 0 && (
                <div className="flex flex-row mx-auto justify-center items-baseline gap-2 my-2">
                  <p className="text-center text-gray-200 dark:text-light text-xl font-semibold">
                    {Math.round(hoveredUV)}
                  </p>
                  <p className="text-center text-gray-200 dark:text-light text-sm">
                    {hoveredRisk}
                  </p>
                </div>
              )}

              <div className="w-full h-[150px] mx-auto mt-1 mb-3">
                {selectedHourlyData && selectedHourlyData.uvHours.length > 0 ? (
                  <canvas ref={chartCanvas} className="w-full h-full"></canvas>
                ) : (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-300 h-full flex items-center justify-center">
                    No UV data available for this day.
                  </p>
                )}
              </div>

              {selectedHourlyData && selectedHourlyData.uvHours.length > 0 && (
                <p className="text-xs text-center font-semibold text-gray-200 dark:text-light mb-2">
                  {selectedDate?.toDateString() === new Date().toDateString()
                    ? "Today"
                    : selectedDate?.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                  {hoveredTime && ` at ${hoveredTime}`}
                </p>
              )}

              <div className="text-center mb-3">
                {lowestRiskLevel === highestRiskLevel ? (
                  <p className="text-sm text-dark dark:text-light">
                    UV index {lowestRiskLevel} on this day
                  </p>
                ) : (
                  <p className="text-sm text-dark dark:text-light">
                    UV index {lowestRiskLevel} to {highestRiskLevel} on this day
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-dark dark:text-light">
          <p>No UV data available.</p>
        </div>
      )}
    </div>
  );
};

export default UVCard;
