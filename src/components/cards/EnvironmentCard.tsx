import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/ui/Loader";

export type Metric = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
  valueClassName?: string;
};

type EnvironmentCardProps = {
  title: string;
  loading: boolean;
  metrics: Metric[];
  gridConfig?: string;
};

const MetricItem = ({ icon, value, label, valueClassName }: Metric) => (
  <div className="flex h-full flex-col items-center justify-center space-y-1 rounded-lg bg-light p-4 text-center shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-gray-700">
    <FontAwesomeIcon
      icon={icon}
      className="mb-2 h-6 w-6 text-blue-200 dark:text-blue-300"
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

const EnvironmentCard = ({
  title,
  loading,
  metrics,
  gridConfig = "grid-cols-2 gap-4",
}: EnvironmentCardProps) => {
  return (
    <div className="relative flex h-full flex-col rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="mb-4 flex items-start justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Loader />
        </div>
      ) : (
        <div className={`grid flex-1 ${gridConfig}`}>
          {metrics.map((metric) => (
            <MetricItem
              key={metric.label}
              icon={metric.icon}
              value={metric.value}
              label={metric.label}
              valueClassName={metric.valueClassName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentCard;
