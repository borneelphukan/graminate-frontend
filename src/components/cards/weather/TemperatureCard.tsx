import { useCallback } from "react";
import { Coordinates } from "@/types/card-props";
import axios from "axios";
import Loader from "@/components/ui/Loader";
import {
  useDisplayMode,
  useLocationName,
  useWeatherData,
} from "@/hooks/weather";
import { useUserPreferences } from "@/contexts/UserPreferencesContext"; 

type HourlyForecast = {
  time: string;
  temperature: number;
  date: string;
  icon: string;
};

type DailyForecast = {
  day: string;
  maxTemp: number; 
  minTemp: number;
  icon: string;
};

type TemperatureWeatherData = {
  temperature: number; 
  apparentTemperature: number;
  isDay: number;
  rain: number | null;
  snowfall: number | null;
  cloudCover: number;
  maxTemp: number;
  minTemp: number;
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];
};

const TemperatureCard = ({ lat, lon }: Coordinates) => {
  const { displayMode, dropdownOpen, toggleDropdown, selectDisplayMode } =
    useDisplayMode<"Small" | "Medium" | "Large">({ initialMode: "Small" });

  const {
    locationName,
    isLoading: isLocationLoading,
    error: locationError,
  } = useLocationName({ lat, lon });

  const { temperatureScale } = useUserPreferences(); // Get temperature scale from context

  const getHourlyWeatherIconUtil = (
    rainVal?: number,
    snowfallVal?: number,
    cloudCoverVal?: number,
    isDayHourVal?: number
  ): string => {
    if (snowfallVal && snowfallVal > 0) return "❄️";
    if (rainVal && rainVal > 0) return "🌧";
    if (cloudCoverVal && cloudCoverVal > 50) return "☁️";
    return isDayHourVal === 1 ? "☀️" : "🌙";
  };

  const fetchTemperatureApiData = useCallback(
    async (
      latitude: number,
      longitude: number
    ): Promise<TemperatureWeatherData | null> => {
      const response = await axios.get("/api/weather", {
        params: { lat: latitude, lon: longitude },
      });
      const data = response.data;

      if (!data || !data.current || !data.daily || !data.hourly) {
        return null;
      }

      const dailyData: DailyForecast[] = data.daily.time
        .map((dateStr: string, index: number): DailyForecast => {
          const day = new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "short",
          });
          let icon = "☀️";
          if (data.daily.snowfallSum?.[index] > 0) icon = "❄️";
          else if (data.daily.rainSum?.[index] > 0) icon = "🌧";
          else if (data.daily.showersSum?.[index] > 0) icon = "🌦";
          else if (data.daily.precipitationSum?.[index] > 0) icon = "🌧";
          else if (
            data.daily.cloudCover?.[index] !== undefined &&
            data.daily.cloudCover[index] > 50
          )
            icon = "☁️";

          return {
            day,
            maxTemp: data.daily.temperature2mMax[index], // Raw Celsius
            minTemp: data.daily.temperature2mMin[index], // Raw Celsius
            icon,
          };
        })
        .slice(0, 7);

      const hourlyTime: string[] = data.hourly.time;
      const hourlyTemperature = Object.values(data.hourly.temperature2m);
      const hourlyData: HourlyForecast[] = hourlyTime.map(
        (timeStr: string, index: number) => ({
          time: timeStr.split("T")[1].split(":")[0],
          date: timeStr.split("T")[0],
          temperature: hourlyTemperature[index] as number,
          icon: getHourlyWeatherIconUtil(
            data.hourly.rain?.[index],
            data.hourly.snowfall?.[index],
            data.hourly.cloudCover?.[index],
            data.hourly.isDay?.[index]
          ),
        })
      );

      const now = new Date(data.current.time);
      const endOfForecast = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const filteredHourlyData = hourlyData.filter((hour) => {
        const hourDate = new Date(`${hour.date}T${hour.time}:00:00`);
        return hourDate >= now && hourDate < endOfForecast;
      });

      const filteredDailyData = dailyData
        .filter((_dayData, index) => {
          const dayDate = new Date(data.daily.time[index]);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate >= today;
        })
        .slice(0, 7);

      return {
        temperature: data.current.temperature2m, // Raw Celsius
        apparentTemperature: data.current.apparentTemperature, // Raw Celsius
        isDay: data.current.isDay,
        rain: data.current.rain,
        snowfall: data.current.snowfall,
        cloudCover: data.current.cloudCover,
        maxTemp: data.daily.temperature2mMax[0], // Raw Celsius
        minTemp: data.daily.temperature2mMin[0], // Raw Celsius
        hourlyForecast: filteredHourlyData,
        dailyForecast: filteredDailyData,
      };
    },
    []
  );

  const {
    data: weatherApiData,
    isLoading: isWeatherLoading,
    error: weatherError,
  } = useWeatherData<TemperatureWeatherData>({
    fetchFunction: fetchTemperatureApiData,
    lat,
    lon,
  });

  const formatTemperature = useCallback(
    (celsiusValue: number | null, showUnit: boolean = true): string => {
      if (celsiusValue === null) return "N/A";

      let displayTemp = celsiusValue;
      let unit = "°C";

      if (temperatureScale === "Fahrenheit") {
        displayTemp = celsiusValue * (9 / 5) + 32;
        unit = "°F";
      }

      const roundedTemp = Math.round(displayTemp);
      return showUnit ? `${roundedTemp}${unit}` : `${roundedTemp}°`;
    },
    [temperatureScale] // Dependency on temperatureScale
  );

  return (
    <div
      className={`p-4 rounded-lg shadow-md max-w-sm mx-auto flex flex-col items-center relative ${
        weatherApiData?.isDay === 1
          ? "bg-gradient-to-t from-blue-300 to-blue-200 text-white"
          : "bg-gradient-to-t from-blue-950 to-blue-100 text-white"
      }`}
    >
      <div className="absolute top-2 right-2 z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6 cursor-pointer"
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
              className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 hover:rounded-t-lg dark:hover:bg-gray-800 cursor-pointer"
              type="button"
              onClick={() => selectDisplayMode("Small")}
            >
              Small
            </button>
            <button
              className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-800 cursor-pointer"
              type="button"
              onClick={() => selectDisplayMode("Medium")}
            >
              Medium
            </button>
            <button
              className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 hover:rounded-b-lg dark:hover:bg-gray-800 cursor-pointer"
              type="button"
              onClick={() => selectDisplayMode("Large")}
            >
              Large
            </button>
          </div>
        )}
      </div>
      {weatherError ? (
        <p className="text-red-500 text-center py-10">{weatherError}</p>
      ) : locationError && !weatherApiData ? (
        <p className="text-red-500 text-center py-10">{locationError}</p>
      ) : isWeatherLoading || (isLocationLoading && !weatherApiData) ? (
        <div className="text-center py-10">
          <Loader />
        </div>
      ) : weatherApiData ? (
        <>
          <div className={`w-full ${displayMode === "Small" ? "pb-8" : ""}`}>
            {(displayMode === "Small" ||
              displayMode === "Medium" ||
              displayMode === "Large") && (
              <div className="flex justify-between w-full items-start">
                <div className="text-left">
                  <p className="text-lg font-semibold">{locationName}</p>
                  <p className="text-4xl font-bold mt-1">
                    {formatTemperature(weatherApiData.temperature)}
                  </p>
                  <p className="mt-1 text-sm">
                    Feels like:{" "}
                    {formatTemperature(weatherApiData.apparentTemperature)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-5xl">
                    {getHourlyWeatherIconUtil(
                      weatherApiData.rain ?? undefined,
                      weatherApiData.snowfall ?? undefined,
                      weatherApiData.cloudCover ?? undefined,
                      weatherApiData.isDay ?? undefined
                    )}
                  </p>
                  <p className="mt-2 text-sm">
                    H: {formatTemperature(weatherApiData.maxTemp)} L:{" "}
                    {formatTemperature(weatherApiData.minTemp)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {(displayMode === "Medium" || displayMode === "Large") && (
            <>
              <hr className="my-4 w-full border-white/50" />
              <div className="w-full overflow-x-auto">
                <div className="flex space-x-4 pb-2">
                  {weatherApiData.hourlyForecast.map((hour, index) => (
                    <div key={index} className="text-center flex-shrink-0 w-14">
                      <p className="text-sm">{hour.time}:00</p>
                      <p className="text-3xl my-1">{hour.icon}</p>
                      <p className="text-md font-medium">
                        {formatTemperature(hour.temperature, false)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {displayMode === "Large" && (
            <>
              <hr className="my-3 w-full border-white/50" />
              <div className="w-full flex flex-col items-center space-y-1">
                {weatherApiData.dailyForecast.map((day, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center w-full px-2"
                  >
                    <p className="text-md font-medium w-1/4 text-left">
                      {day.day}
                    </p>
                    <p className="text-2xl w-1/4 text-center">{day.icon}</p>
                    <div className="w-1/2 flex justify-end space-x-3">
                      <p className="text-md font-medium">
                        {formatTemperature(day.minTemp, false)}
                      </p>
                      <p className="text-md font-medium opacity-70">
                        {formatTemperature(day.maxTemp, false)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default TemperatureCard;
