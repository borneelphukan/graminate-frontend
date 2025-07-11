import Loader from "@/components/ui/Loader";
import {
  faCloudRain,
  faDroplet,
  faExclamationTriangle,
  faThermometerHalf,
  faWind,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type EnvironmentCardProps = {
  loading: boolean;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  formatTemperature: (value: number | null) => string;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
  valueClassName?: string;
};

const MetricItem = ({
  icon,
  value,
  label,
  valueClassName,
}: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-light dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-300 mb-2"
      aria-hidden="true"
    />
    <p
      className={`text-2xl font-semibold text-dark dark:text-light ${
        valueClassName || ""
      }`}
    >
      {value}
    </p>
    <p className="text-sm text-dark dark:text-light">{label}</p>
  </div>
);

const getWindDirectionSymbol = (degrees: number | null): string => {
  if (degrees === null) return "";
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const ApicultureEnvironmentCard = ({
  loading,
  temperature,
  humidity,
  precipitation,
  windSpeed,
  windDirection,
  formatTemperature,
}: EnvironmentCardProps) => {
  const isTempWarning =
    temperature !== null && (temperature < 10 || temperature > 35);

  const displayValue = (value: number | null, unit: string = ""): string => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value)}${unit}`;
  };

  const windValue =
    windSpeed !== null
      ? `${displayValue(windSpeed, " km/h")} ${getWindDirectionSymbol(
          windDirection
        )}`
      : "N/A";

  return (
    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Hive Conditions
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-1 justify-center items-center py-8">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 flex-1">
          <MetricItem
            icon={faThermometerHalf}
            label="Temperature"
            valueClassName={isTempWarning ? "text-yellow-400" : ""}
            value={
              <>
                {formatTemperature(temperature)}
                {isTempWarning && (
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="ml-2 h-4 w-4"
                    title="Temperature is outside the optimal range for bees (10-35°C)."
                  />
                )}
              </>
            }
          />
          <MetricItem
            icon={faDroplet}
            value={displayValue(humidity, "%")}
            label="Humidity"
          />
          <MetricItem
            icon={faCloudRain}
            value={displayValue(precipitation, " mm")}
            label="Precipitation"
          />
          <MetricItem icon={faWind} value={windValue} label="Wind" />
        </div>
      )}
    </div>
  );
};

export default ApicultureEnvironmentCard;
