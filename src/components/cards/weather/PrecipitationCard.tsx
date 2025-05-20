import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDroplet, faEllipsis } from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
import type { ChartConfiguration, Chart as ChartJS, Scale } from "chart.js";
import axios from "axios";

import { Coordinates } from "@/types/card-props";
import Loader from "@/components/ui/Loader";
import { useDisplayMode, useWeatherData } from "@/hooks/weather";

type WeatherData = {
  time: Date[];
  precipitation: number[];
};

type HourlyPrecipData = {
  day: Date;
  precipHours: {
    time: Date;
    precipitation: number;
  }[];
};

const PrecipitationCard = ({ lat, lon }: Coordinates) => {
  const [past6HoursRain, setPast6HoursRain] = useState<number>(0);
  const [next24HoursRain, setNext24HoursRain] = useState<number>(0);

  const [availableDays, setAvailableDays] = useState<
    { date: Date; weekday: string; day: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHourlyData, setSelectedHourlyData] = useState<
    HourlyPrecipData | undefined
  >(undefined);
  const [hourlyPrecipDataByDay, setHourlyPrecipDataByDay] = useState<
    HourlyPrecipData[]
  >([]);

  const chartCanvas = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const [hoveredTime, setHoveredTime] = useState<string>("");
  const [hoveredPrecip, setHoveredPrecip] = useState<number>(0);

  const { displayMode, dropdownOpen, toggleDropdown, selectDisplayMode } =
    useDisplayMode<"Small" | "Large">({ initialMode: "Small" });

  const fetchPrecipitationApiData = useCallback(
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
      return {
        time: response.data.hourly.time.map((t: string) => new Date(t)),
        precipitation: response.data.hourly.precipitation,
      };
    },
    []
  );

  const {
    data: weatherData,
    isLoading: isWeatherLoading,
    error: weatherError,
  } = useWeatherData<WeatherData>({
    fetchFunction: fetchPrecipitationApiData,
    lat,
    lon,
  });

  useEffect(() => {
    if (weatherData && displayMode === "Small") {
      const now = new Date();
      const hoursData = weatherData.time.map((t: Date, index: number) => ({
        time: t,
        precipitation: weatherData.precipitation[index] || 0,
      }));

      const past6 = hoursData
        .filter(
          (entry: { time: Date; precipitation: number }) =>
            entry.time <= now &&
            entry.time > new Date(now.getTime() - 6 * 60 * 60 * 1000)
        )
        .reduce(
          (sum: number, entry: { time: Date; precipitation: number }) =>
            sum + entry.precipitation,
          0
        );

      const next24 = hoursData
        .filter(
          (entry: { time: Date; precipitation: number }) =>
            entry.time > now &&
            entry.time <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
        )
        .reduce(
          (sum: number, entry: { time: Date; precipitation: number }) =>
            sum + entry.precipitation,
          0
        );

      setPast6HoursRain(past6);
      setNext24HoursRain(next24);
    }
  }, [weatherData, displayMode]);

  useEffect(() => {
    if (weatherData) {
      const groups: {
        [key: string]: {
          day: Date;
          precipHours: { time: Date; precipitation: number }[];
        };
      } = {};
      weatherData.time.forEach((time: Date, index: number) => {
        const key = time.toDateString();
        if (!groups[key]) {
          groups[key] = { day: time, precipHours: [] };
        }
        groups[key].precipHours.push({
          time,
          precipitation: weatherData.precipitation[index] || 0,
        });
      });

      const hourlyDataByDay = Object.values(groups).sort(
        (a, b) => a.day.getTime() - b.day.getTime()
      );
      setHourlyPrecipDataByDay(hourlyDataByDay);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const available = hourlyDataByDay
        .filter((group) => {
          const groupDate = new Date(group.day);
          groupDate.setHours(0, 0, 0, 0);
          return groupDate >= today;
        })
        .slice(0, 7)
        .map((group) => ({
          date: group.day,
          weekday: group.day.toLocaleDateString(undefined, {
            weekday: "short",
          }),
          day: group.day.toLocaleDateString(undefined, { day: "numeric" }),
        }));
      setAvailableDays(available);
    }
  }, [weatherData]);

  useEffect(() => {
    if (
      hourlyPrecipDataByDay.length > 0 &&
      availableDays.length > 0 &&
      !selectedDate
    ) {
      const todayStr = new Date().toDateString();
      const foundToday = hourlyPrecipDataByDay.find(
        (g) => g.day.toDateString() === todayStr
      );
      setSelectedDate(foundToday ? foundToday.day : availableDays[0].date);
    }
  }, [hourlyPrecipDataByDay, availableDays, selectedDate]);

  useEffect(() => {
    if (selectedDate && availableDays.length > 0) {
      const isSelectedDateAvailable = availableDays.some(
        (d) => d.date.toDateString() === selectedDate.toDateString()
      );
      if (!isSelectedDateAvailable) {
        const todayStr = new Date().toDateString();
        const foundToday = hourlyPrecipDataByDay.find(
          (g) => g.day.toDateString() === todayStr
        );
        setSelectedDate(foundToday ? foundToday.day : availableDays[0].date);
      }
    }
  }, [selectedDate, availableDays, hourlyPrecipDataByDay]);

  useEffect(() => {
    if (availableDays.length > 0 && selectedDate) {
      const isSelectedDateAvailable = availableDays.some(
        (d) => d.date.toDateString() === selectedDate.toDateString()
      );
      if (!isSelectedDateAvailable) {
        const todayStr = new Date().toDateString();
        const foundToday = hourlyPrecipDataByDay.find(
          (g) => g.day.toDateString() === todayStr
        );
        setSelectedDate(foundToday ? foundToday.day : availableDays[0].date);
      }
    }
  }, [availableDays, selectedDate, hourlyPrecipDataByDay]);

  useEffect(() => {
    if (selectedDate && hourlyPrecipDataByDay.length > 0) {
      const sel = hourlyPrecipDataByDay.find(
        (group) => group.day.toDateString() === selectedDate.toDateString()
      );
      setSelectedHourlyData(sel);
      // Reset hover state when date changes
      setHoveredTime("");
      setHoveredPrecip(0);
    }
  }, [selectedDate, hourlyPrecipDataByDay]);

  const getDynamicTicks = useCallback((max: number): number[] => {
    if (max <= 0) return [0];
    if (max <= 1) return [0, 0.5, 1];
    if (max <= 2.5) return [0, 1, 2.5];
    if (max <= 5) return [0, 2.5, 5];
    if (max <= 10) return [0, 5, 10];
    if (max <= 20) return [0, 10, 20];
    if (max <= 40) return [0, 20, 40];
    return [0, Math.ceil(max / 2), Math.ceil(max)];
  }, []);

  useEffect(() => {
    if (displayMode === "Large" && selectedHourlyData && chartCanvas.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      if (selectedHourlyData.precipHours.length === 0) {
        return;
      }

      const labels = selectedHourlyData.precipHours.map((pt) =>
        pt.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      const dataValues = selectedHourlyData.precipHours.map(
        (pt) => pt.precipitation
      );
      const maxPrecip = Math.max(0, ...dataValues);
      const dynamicTicks = getDynamicTicks(maxPrecip);
      const maxYValue =
        dynamicTicks.length > 1 ? dynamicTicks[dynamicTicks.length - 1] : 1;

      const chartConfig: ChartConfiguration<"bar"> = {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Precipitation",
              data: dataValues,
              backgroundColor: "#1E90FF",
              barPercentage: 0.7,
              categoryPercentage: 0.8,
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
                  const precip = context.parsed.y;
                  setHoveredPrecip(precip);
                  setHoveredTime(context.label);
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
                color: "#a0aec0",
              },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              max: maxYValue,
              grid: {
                drawTicks: false,
                color: "rgba(200, 200, 200, 0.2)",
              },
              ticks: {
                padding: 5,
                font: { size: 10 },
                color: "#a0aec0",
                callback: function (value: string | number) {
                  if (
                    typeof value === "number" &&
                    dynamicTicks.includes(value)
                  ) {
                    return value + "mm";
                  }
                  return "";
                },
                stepSize:
                  dynamicTicks.length > 1
                    ? dynamicTicks[1] - dynamicTicks[0]
                    : 1,
              },
              afterBuildTicks: function (scale: Scale) {
                scale.ticks = dynamicTicks.map((value: number) => ({
                  value,
                  label: value + "mm",
                }));
              },
              border: { display: false },
            },
          },
        },
      };
      chartRef.current = new Chart(chartCanvas.current, chartConfig);
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [displayMode, selectedHourlyData, getDynamicTicks]);

  const totalPrecipitation = selectedHourlyData
    ? selectedHourlyData.precipHours.reduce(
        (sum, pt) => sum + pt.precipitation,
        0
      )
    : 0;

  let precipSummary = "";
  if (selectedHourlyData) {
    if (
      totalPrecipitation >= 10 ||
      selectedHourlyData.precipHours.some((pt) => pt.precipitation >= 5)
    ) {
      precipSummary = "Heavy rain possible.";
    } else if (
      totalPrecipitation >= 2.5 ||
      selectedHourlyData.precipHours.some((pt) => pt.precipitation >= 1)
    ) {
      precipSummary = "Moderate rain possible.";
    } else if (totalPrecipitation > 0) {
      precipSummary = "Light rain possible.";
    } else {
      precipSummary = "No rain expected.";
    }
  }

  const firstHourData = selectedHourlyData?.precipHours[0];
  const defaultHoverTime =
    firstHourData?.time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) || "";
  const defaultHoverPrecip = firstHourData?.precipitation || 0;

  return (
    <div className="p-4 rounded-lg shadow-md max-w-sm mx-auto flex flex-col items-center relative dark:bg-gray-700 bg-gray-500">
      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          className="w-6 h-6 cursor-pointer text-dark dark:text-light focus:outline-none"
          onClick={toggleDropdown}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggleDropdown();
              e.preventDefault();
            }
          }}
          tabIndex={0}
          aria-label="Toggle card size options"
          aria-expanded={dropdownOpen}
        >
          <FontAwesomeIcon icon={faEllipsis} className="w-6 h-6" />
        </button>
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
        <p className="text-red-200 text-center py-10">Error: {weatherError}</p>
      ) : isWeatherLoading ? (
        <div className="text-center py-10 text-dark dark:text-light">
          <Loader />
        </div>
      ) : weatherData ? (
        <>
          {displayMode === "Small" && (
            <div className="w-full pb-1">
              <div className="flex flex-col items-left w-full p-1 text-center rounded-md">
                <div className="w-full flex flex-row items-center gap-2">
                  <FontAwesomeIcon
                    icon={faDroplet}
                    className="w-4 h-4 text-blue-200"
                  />
                  <p className="text-sm uppercase tracking-wide text-gray-200 dark:text-light">
                    Precipitation
                  </p>
                </div>
                <p className="text-2xl py-2 text-left text-dark dark:text-gray-300">
                  {past6HoursRain.toFixed(1)} mm
                </p>
                <p className="text-sm dark:text-light text-dark text-left pb-2">
                  In last 6 hours
                </p>
                <p className="text-sm dark:text-light text-dark text-left">
                  {next24HoursRain.toFixed(1)} mm expected in next 24 hours
                </p>
              </div>
            </div>
          )}

          {displayMode === "Large" && (
            <div className="w-full flex flex-col">
              <div className="flex flex-row justify-center items-center gap-2 mb-2">
                <FontAwesomeIcon
                  icon={faDroplet}
                  className="w-5 h-5 text-blue-200"
                />
                <p className="text-sm uppercase tracking-wide text-gray-200 dark:text-light">
                  Precipitation
                </p>
              </div>

              <div className="text-center text-gray-200 dark:text-light my-2 pt-2 flex justify-around">
                {availableDays.map((dayItem, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-xs font-semibold">
                      {dayItem.weekday}
                    </span>
                    <button
                      type="button"
                      className={`mt-1 flex flex-col items-center cursor-pointer px-2 py-1 rounded-full ${
                        selectedDate &&
                        dayItem.date.toDateString() ===
                          selectedDate.toDateString()
                          ? "bg-green-200 text-white"
                          : "hover:bg-gray-400 dark:hover:bg-gray-300"
                      }`}
                      onClick={() => setSelectedDate(dayItem.date)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedDate(dayItem.date);
                        }
                      }}
                      tabIndex={0}
                      aria-pressed={
                        selectedDate &&
                        dayItem.date.toDateString() ===
                          selectedDate.toDateString()
                          ? true
                          : false
                      }
                      aria-label={`Select precipitation data for ${dayItem.weekday}, ${dayItem.day}`}
                    >
                      <span className="text-sm">{dayItem.day}</span>
                    </button>
                  </div>
                ))}
              </div>

              {selectedHourlyData && (
                <div className="flex flex-row mx-auto justify-center items-baseline gap-2 my-2">
                  <p className="text-center text-gray-200 dark:text-light text-xl font-semibold">
                    {(hoveredTime ? hoveredPrecip : defaultHoverPrecip).toFixed(
                      1
                    )}{" "}
                    mm
                  </p>
                </div>
              )}

              <div className="w-full h-[150px] mx-auto mt-1 mb-3">
                {selectedHourlyData &&
                selectedHourlyData.precipHours.length > 0 ? (
                  <canvas ref={chartCanvas} className="w-full h-full"></canvas>
                ) : (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-300 h-full flex items-center justify-center">
                    No precipitation data available for this day.
                  </p>
                )}
              </div>

              {selectedHourlyData && (
                <p className="text-xs text-center font-semibold text-gray-200 dark:text-light mb-2">
                  {selectedDate?.toDateString() === new Date().toDateString()
                    ? "Today"
                    : selectedDate?.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                  {(hoveredTime || defaultHoverTime) &&
                    ` at ${hoveredTime || defaultHoverTime}`}
                </p>
              )}

              <div className="text-center mb-3">
                <p className="text-sm text-dark dark:text-light">
                  Total: {totalPrecipitation.toFixed(1)} mm. {precipSummary}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-dark dark:text-light">
          <p>No precipitation data available.</p>
        </div>
      )}
    </div>
  );
};

export default PrecipitationCard;
