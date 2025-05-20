import Loader from "@/components/ui/Loader";
import {
  faDroplet,
  faSun,
  faThermometerHalf,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type EnvironmentCardProps = {
  temperature: number | null;
  humidity: number | null;
  lightHours: number | null;
  formatTemperature: (value: number | null, showUnit?: boolean) => string;
  onCustomUrlSubmit: (url: string) => void;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
};

const MetricItem = ({ icon, value, label }: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-400 mb-2"
      aria-hidden="true"
    />
    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
      {value}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
  </div>
);

const EnvironmentCard = ({
  temperature,
  humidity,
  lightHours,
  formatTemperature,
}: EnvironmentCardProps) => {
  const isLoading =
    temperature === null || humidity === null || lightHours === null;

  const displayValue = (
    value: number | null | undefined,
    unit: string = "",
    toFixedPlaces?: number
  ): string => {
    if (value === null || value === undefined) return "N/A";
    const numericValue =
      typeof toFixedPlaces === "number" ? value.toFixed(toFixedPlaces) : value;
    return `${numericValue}${unit}`;
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      {/* Top Row */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Environmental Conditions
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            icon={faThermometerHalf}
            value={formatTemperature(temperature)}
            label="Avg. Temperature"
          />
          <MetricItem
            icon={faDroplet}
            value={displayValue(humidity, "%")}
            label="Avg. Humidity"
          />
          <MetricItem
            icon={faSun}
            value={displayValue(lightHours, " Hrs", 1)}
            label="Light Hours"
          />
        </div>
      )}
    </div>
  );
};

export default EnvironmentCard;
