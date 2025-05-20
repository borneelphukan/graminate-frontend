import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun } from "@fortawesome/free-solid-svg-icons";
import { Coordinates } from "@/types/card-props";
import axios from "axios";
import Loader from "@/components/ui/Loader";
import { useDisplayMode, useWeatherData } from "@/hooks/weather";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

type DailySunData = {
  time: string[];
  daylightDuration: number[];
};

const SunCard = ({ lat, lon }: Coordinates) => {
  const { timeFormat } = useUserPreferences();

  const [sunriseTime, setSunriseTime] = useState<string | null>(null);
  const [sunsetTime, setSunsetTime] = useState<string | null>(null);

  const [sunTimesArray, setSunTimesArray] = useState<
    { date: string; sunrise: string; sunset: string }[]
  >([]);
  const [currentXSun, setCurrentXSun] = useState<number>(0);
  const [currentYSun, setCurrentYSun] = useState<number>(0);
  const [hoverXSun, setHoverXSun] = useState<number>(0);
  const [hoverYSun, setHoverYSun] = useState<number>(0);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const [displayedSunsetTime, setDisplayedSunsetTime] = useState<string | null>(
    null
  );
  const [sunsetLabel, setSunsetLabel] = useState<string>("");
  const { displayMode, dropdownOpen, toggleDropdown, selectDisplayMode } =
    useDisplayMode<"Small" | "Large">({ initialMode: "Small" });

  const fetchSunApiData = useCallback(
    async (
      latitude: number,
      longitude: number
    ): Promise<DailySunData | null> => {
      const response = await axios.get("/api/weather", {
        params: {
          lat: latitude,
          lon: longitude,
        },
      });
      if (
        response.data &&
        response.data.daily &&
        response.data.daily.time &&
        response.data.daily.daylightDuration
      ) {
        return response.data.daily as DailySunData;
      }
      return null;
    },
    []
  );

  const {
    data: dailySunData,
    isLoading: isSunDataLoading,
    error: sunDataError,
  } = useWeatherData<DailySunData>({
    fetchFunction: fetchSunApiData,
    lat,
    lon,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  const parseTimeToMinutes = useCallback((time: string): number => {
    if (!time || !time.includes(":")) return 0;
    const parts = time.split(":");
    let h = parseInt(parts[0], 10);
    const mString = parts[1].replace(/[^0-9]/g, "");
    const m = parseInt(mString, 10);

    if (isNaN(h) || isNaN(m)) return 0;

    const isPM = time.toLowerCase().includes("pm");
    const isAM = time.toLowerCase().includes("am");

    if (isPM && h < 12) {
      h += 12;
    } else if (isAM && h === 12) {
      h = 0;
    }
    return h * 60 + m;
  }, []);

  const formatTimeFromMinutes = useCallback(
    (minutes: number): string => {
      const date = new Date();
      date.setHours(
        Math.floor(minutes / 60) % 24,
        Math.floor(minutes % 60),
        0,
        0
      );
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: timeFormat === "12-hour",
      });
    },
    [timeFormat]
  );

  const formatDuration = (minutes: number): string => {
    if (minutes < 0) minutes = 0;
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}h ${mins}m`;
  };

  const calculateAndFormatSunriseSunset = useCallback(
    (
      daylightSeconds: number
    ): {
      sunrise: string;
      sunset: string;
    } => {
      if (isNaN(daylightSeconds) || daylightSeconds <= 0) {
        return { sunrise: "--:--", sunset: "--:--" };
      }
      const daylightHours = daylightSeconds / 3600;
      const halfDaylight = daylightHours / 2;
      const solarNoonMinutes = 12 * 60;
      const sunriseMinutes = solarNoonMinutes - halfDaylight * 60;
      const sunsetMinutes = solarNoonMinutes + halfDaylight * 60;
      return {
        sunrise: formatTimeFromMinutes(sunriseMinutes),
        sunset: formatTimeFromMinutes(sunsetMinutes),
      };
    },
    [formatTimeFromMinutes]
  );

  const calculateSunPosition = (t: number): { x: number; y: number } => {
    const clampedT = Math.max(0, Math.min(1, t));
    const pathWidth = 160;
    const pathHeight = 50;
    const midPointX = pathWidth / 2;
    const p0x = 0,
      p0y = pathHeight;
    const p1x = midPointX,
      p1y = 0;
    const p2x = pathWidth,
      p2y = pathHeight;
    const currentX =
      Math.pow(1 - clampedT, 2) * p0x +
      2 * (1 - clampedT) * clampedT * p1x +
      Math.pow(clampedT, 2) * p2x;
    const currentY =
      Math.pow(1 - clampedT, 2) * p0y +
      2 * (1 - clampedT) * clampedT * p1y +
      Math.pow(clampedT, 2) * p2y;
    return { x: currentX, y: currentY - 1 };
  };

  useEffect(() => {
    if (dailySunData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let startIndex = dailySunData.time.findIndex((dateStr: string) => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date >= today;
      });
      if (startIndex === -1) {
        startIndex = 0;
      }
      if (
        dailySunData.daylightDuration &&
        dailySunData.daylightDuration[startIndex] !== undefined &&
        dailySunData.daylightDuration[startIndex] !== null
      ) {
        const { sunrise, sunset } = calculateAndFormatSunriseSunset(
          dailySunData.daylightDuration[startIndex]
        );
        setSunriseTime(sunrise);
        setSunsetTime(sunset);
      } else {
        setSunriseTime("--:--");
        setSunsetTime("--:--");
      }
      const arr: { date: string; sunrise: string; sunset: string }[] = [];
      const maxDays = dailySunData.time.length;
      for (let i = startIndex; i < Math.min(startIndex + 7, maxDays); i++) {
        if (
          dailySunData.daylightDuration?.[i] !== undefined &&
          dailySunData.daylightDuration?.[i] !== null &&
          dailySunData.time?.[i]
        ) {
          const { sunrise, sunset } = calculateAndFormatSunriseSunset(
            dailySunData.daylightDuration[i]
          );
          arr.push({
            date: dailySunData.time[i],
            sunrise,
            sunset,
          });
        }
      }
      setSunTimesArray(arr);
    }
  }, [dailySunData, calculateAndFormatSunriseSunset]);

  useEffect(() => {
    if (
      sunriseTime &&
      sunsetTime &&
      sunriseTime !== "--:--" &&
      sunsetTime !== "--:--"
    ) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const sunriseMins = parseTimeToMinutes(sunriseTime);
      const sunsetMins = parseTimeToMinutes(sunsetTime);
      if (sunsetMins <= sunriseMins) {
        setCurrentXSun(0);
        setCurrentYSun(50);
        return;
      }
      const t = (currentMinutes - sunriseMins) / (sunsetMins - sunriseMins);
      const { x, y } = calculateSunPosition(t);
      setCurrentXSun(x);
      setCurrentYSun(y);
    } else {
      setCurrentXSun(0);
      setCurrentYSun(50);
    }
  }, [sunriseTime, sunsetTime, parseTimeToMinutes]);

  useEffect(() => {
    if (displayMode === "Large" && sunTimesArray.length > 0) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      let displayIndex = 0;
      const todaysSunsetMinutes = parseTimeToMinutes(sunTimesArray[0]?.sunset);
      if (
        sunTimesArray[0]?.sunset &&
        currentMinutes >= todaysSunsetMinutes &&
        sunTimesArray.length > 1
      ) {
        displayIndex = 1;
        setSunsetLabel("Sunset Tomorrow");
      } else if (sunTimesArray[0]?.sunset) {
        setSunsetLabel("Sunset Today");
      } else {
        setSunsetLabel("Sunset");
      }
      setDisplayedSunsetTime(sunTimesArray[displayIndex]?.sunset || "--:--");
    }
  }, [displayMode, sunTimesArray, parseTimeToMinutes]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (
      !svgRef.current ||
      !sunriseTime ||
      !sunsetTime ||
      sunriseTime === "--:--" ||
      sunsetTime === "--:--"
    )
      return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const relativeX = svgP.x;
    const viewBoxWidth = 160;
    let t = relativeX / viewBoxWidth;
    t = Math.max(0, Math.min(1, t));
    const sunriseMins = parseTimeToMinutes(sunriseTime);
    const sunsetMins = parseTimeToMinutes(sunsetTime);
    if (sunsetMins > sunriseMins) {
      const hoveredMinutes = sunriseMins + t * (sunsetMins - sunriseMins);
      setHoveredTime(formatTimeFromMinutes(hoveredMinutes));
      const { x, y } = calculateSunPosition(t);
      setHoverXSun(x);
      setHoverYSun(y);
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoveredTime(null);
  };

  const displayXSun = isHovering ? hoverXSun : currentXSun;
  const displayYSun = isHovering ? hoverYSun : currentYSun;

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
      {sunDataError ? (
        <p className="text-red-500 text-center py-10">{sunDataError}</p>
      ) : isSunDataLoading ? (
        <p className="text-center py-10 text-dark dark:text-light">
          <Loader />
        </p>
      ) : dailySunData ? (
        <>
          {displayMode === "Small" &&
            sunriseTime !== null &&
            sunsetTime !== null && (
              <div
                className={`w-full ${displayMode === "Small" ? "pb-8" : ""}`}
              >
                <div className="flex flex-col items-center w-full text-center rounded-md">
                  <div className="w-full flex flex-row items-center justify-center mb-2 gap-2">
                    <FontAwesomeIcon
                      icon={faSun}
                      className="w-4 h-4 text-yellow-200"
                    />
                    <p className="text-sm uppercase tracking-wide text-gray-200 dark:text-light">
                      Sunrise & Sunset
                    </p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-2 text-center mb-1 px-2">
                    <div>
                      <p className="text-xs tracking-wide text-dark dark:text-light">
                        Sunrise
                      </p>
                      <p className="text-lg font-semibold text-dark dark:text-light">
                        {sunriseTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-wide text-dark dark:text-light">
                        Sunset
                      </p>
                      <p className="text-lg font-semibold text-dark dark:text-light">
                        {sunsetTime}
                      </p>
                    </div>
                  </div>
                  <div className="h-4">
                    {isHovering && hoveredTime && (
                      <p className="text-center text-md text-dark dark:text-light font-bold">
                        {hoveredTime}
                      </p>
                    )}
                  </div>
                  <div
                    className="relative w-full max-w-2/3 mx-auto cursor-crosshair"
                    onMouseLeave={handleMouseLeave}
                  >
                    <svg
                      ref={svgRef}
                      viewBox="0 0 160 55"
                      className="w-full h-auto overflow-visible"
                      onMouseMove={handleMouseMove}
                    >
                      <path
                        d="M0,50 H160 V55 H0 Z"
                        className="fill-gray-600 dark:fill-gray-800"
                      />
                      <path
                        d="M0,50 Q80,0 160,50"
                        className="stroke-gray-300 dark:stroke-gray-500"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="2,2"
                      />
                      <line
                        x1="0"
                        y1="50"
                        x2="160"
                        y2="50"
                        className="stroke-gray-500 dark:stroke-gray-600"
                        strokeWidth="1.5"
                      />
                      <g
                        transform={`translate(${displayXSun}, ${displayYSun})`}
                      >
                        <circle
                          cx="0"
                          cy="0"
                          r="5"
                          className={
                            displayYSun >= 49
                              ? "fill-gray-200 dark:fill-gray-200"
                              : "fill-yellow-200"
                          }
                        />
                        {displayYSun < 49 &&
                          Array.from({ length: 8 }).map((_, i) => {
                            const angle = (i * 45 * Math.PI) / 180;
                            return (
                              <line
                                key={i}
                                x1={Math.cos(angle) * 6}
                                y1={Math.sin(angle) * 6}
                                x2={Math.cos(angle) * 8}
                                y2={Math.sin(angle) * 8}
                                className="stroke-yellow-200"
                                strokeWidth="1.5"
                              />
                            );
                          })}
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          {displayMode === "Large" && sunTimesArray.length > 0 && (
            <div className="w-full flex flex-col">
              {displayedSunsetTime && (
                <div className="text-center mb-4">
                  <p className="text-sm text-dark dark:text-light">
                    {sunsetLabel}
                  </p>
                  <p className="text-3xl font-semibold text-gray-100 dark:text-light mt-1">
                    {displayedSunsetTime}
                  </p>
                </div>
              )}
              <div className="w-full space-y-1 border-t border-b border-gray-400 dark:border-gray-600 py-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark dark:text-light">
                    First Light
                  </span>
                  <span className="text-sm font-medium text-gray-100 dark:text-light">
                    {formatTimeFromMinutes(
                      Math.max(
                        parseTimeToMinutes(sunTimesArray[0].sunrise) - 30,
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark dark:text-light">
                    Sunrise
                  </span>
                  <span className="text-sm font-medium text-gray-100 dark:text-light">
                    {sunTimesArray[0].sunrise}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark dark:text-light">
                    Sunset
                  </span>
                  <span className="text-sm font-medium text-gray-100 dark:text-light">
                    {sunTimesArray[0].sunset}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-dark dark:text-light">
                    Last Light
                  </span>
                  <span className="text-sm font-medium text-gray-100 dark:text-light">
                    {formatTimeFromMinutes(
                      Math.min(
                        parseTimeToMinutes(sunTimesArray[0].sunset) + 30,
                        1439
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-dark dark:text-light">
                    Daylight Duration
                  </span>
                  <span className="text-sm font-medium text-gray-100 dark:text-light">
                    {formatDuration(
                      parseTimeToMinutes(sunTimesArray[0].sunset) -
                        parseTimeToMinutes(sunTimesArray[0].sunrise)
                    )}
                  </span>
                </div>
              </div>
              <p className="text-xs text-center text-dark dark:text-light mb-2">
                Upcoming Days
              </p>
              <div
                className="w-full overflow-y-auto"
                style={{ maxHeight: "160px" }}
              >
                <div className="flex flex-col space-y-1">
                  {sunTimesArray.slice(1).map((sunData, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-gray-400"
                    >
                      <p className="text-sm font-medium text-dark dark:text-light w-10 text-left">
                        {new Date(sunData.date).toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </p>
                      <p className="text-xs text-dark dark:text-light w-12 text-center">
                        {sunData.sunrise}
                      </p>
                      <div className="flex-1 h-1.5 bg-gray-700 dark:bg-gray-800 rounded-full overflow-hidden mx-2">
                        <div
                          className="h-full bg-yellow-200"
                          style={{
                            marginLeft: `${
                              (parseTimeToMinutes(sunData.sunrise) / 1440) * 100
                            }%`,
                            width: `${Math.max(
                              0,
                              ((parseTimeToMinutes(sunData.sunset) -
                                parseTimeToMinutes(sunData.sunrise)) /
                                1440) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-dark dark:text-light w-12 text-center">
                        {sunData.sunset}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-dark dark:text-light">
          <p>No sun data available.</p>
        </div>
      )}
    </div>
  );
};

export default SunCard;
