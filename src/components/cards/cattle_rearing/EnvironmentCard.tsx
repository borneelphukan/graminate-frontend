import Loader from "@/components/ui/Loader";
import {
  faCloudRain,
  faDroplet,
  faSun,
  faThermometerHalf,
  faWind,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type CattleEnvironmentCardProps = {
  loading: boolean;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
  formatTemperature: (value: number | null, showUnit?: boolean) => string;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
};

const MetricItem = ({ icon, value, label }: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-light dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-300 mb-2"
      aria-hidden="true"
    />
    <p className="text-2xl font-semibold text-dark dark:text-light">{value}</p>
    <p className="text-sm text-dark dark:text-light">{label}</p>
  </div>
);

const CattleEnvironmentCard = ({
  loading,
  temperature,
  humidity,
  rainfall,
  windSpeed,
  uvIndex,
  formatTemperature,
}: CattleEnvironmentCardProps) => {
  const displayValue = (
    value: number | null | undefined,
    unit: string = "",
    toFixedPlaces?: number
  ): string => {
    if (value === null || value === undefined) return "N/A";
    const numericValue =
      typeof toFixedPlaces === "number"
        ? value.toFixed(toFixedPlaces)
        : Math.round(value);
    return `${numericValue}${unit}`;
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Environmental Conditions
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-1 justify-center items-center py-8">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
          <MetricItem
            icon={faThermometerHalf}
            value={formatTemperature(temperature)}
            label="Temperature"
          />
          <MetricItem
            icon={faDroplet}
            value={displayValue(humidity, "%")}
            label="Humidity"
          />
          <MetricItem
            icon={faCloudRain}
            value={displayValue(rainfall, " mm")}
            label="Rainfall"
          />
          <MetricItem
            icon={faWind}
            value={displayValue(windSpeed, " km/h", 1)}
            label="Wind Speed"
          />
          <MetricItem
            icon={faSun}
            value={displayValue(uvIndex, "", 1)}
            label="UV Index"
          />
        </div>
      )}
    </div>
  );
};

export default CattleEnvironmentCard;
