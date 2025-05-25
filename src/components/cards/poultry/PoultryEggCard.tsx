import {
  faPercent,
  faBalanceScale,
  faBasketShopping,
  faPlusCircle,
  faChartLine,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Line } from "react-chartjs-2";
import React, { useState } from "react";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Title,
  ChartData,
  ChartOptions,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
);

type Props = {
  brokenEggsPercentage: number;
  averageEggWeight: string;
  totalEggsCollected: number;
  onLogEggCollection: () => void;
  eggCollectionLineData: ChartData<"line">;
  eggCollectionLineOptions?: Partial<ChartOptions<"line">>;
  onManageClick: () => void;
  loading: boolean;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
};

const MetricItem = ({ icon, value, label }: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-300 mb-2"
      aria-hidden="true"
    />
    <p className="text-lg font-semibold text-gray-900 dark:text-white">
      {value}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
  </div>
);

const PoultryEggCard = ({
  brokenEggsPercentage,
  averageEggWeight,
  totalEggsCollected,
  eggCollectionLineData,
  eggCollectionLineOptions = {},
  onManageClick,
  loading,
}: Props) => {
  const [activeView, setActiveView] = useState<"graphs" | "metrics">("graphs");

  const defaultLineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
          boxWidth: 12,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: "Daily Egg Collection Trend",
        color: document.documentElement.classList.contains("dark")
          ? "#e5e7eb"
          : "#374151",
        font: {
          size: 16,
        },
        padding: {
          bottom: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains("dark")
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
        },
      },
      y: {
        grid: {
          color: document.documentElement.classList.contains("dark")
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
        },
        beginAtZero: true,
      },
    },
  };

  const finalOptions = { ...defaultLineOptions, ...eggCollectionLineOptions };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-dark dark:text-light text-center sm:text-left sm:mb-0">
          Egg Collection
        </h2>
        <div className="flex items-center space-x-1 bg-gray-500 dark:bg-gray-700 p-1 rounded-lg mt-3 sm:mt-0">
          <button
            onClick={() => setActiveView("graphs")}
            aria-pressed={activeView === "graphs"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out flex items-center space-x-2 ${
              activeView === "graphs"
                ? "bg-white dark:bg-gray-600 text-blue-200 dark:text-blue-300 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-600/50"
            }`}
          >
            <FontAwesomeIcon icon={faChartLine} className="size-4" />
            <span>Graphs</span>
          </button>
          <button
            onClick={() => setActiveView("metrics")}
            aria-pressed={activeView === "metrics"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out flex items-center space-x-2 ${
              activeView === "metrics"
                ? "bg-white dark:bg-gray-600 text-blue-200 dark:text-blue-300 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-600/50"
            }`}
          >
            <FontAwesomeIcon icon={faThLarge} className="size-4" />
            <span>Metrics</span>
          </button>
        </div>
      </div>

      {activeView === "metrics" && (
        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            icon={faPercent}
            value={`${brokenEggsPercentage.toFixed(1)}%`}
            label="Broken Eggs"
          />
          <MetricItem
            icon={faBalanceScale}
            value={averageEggWeight}
            label="Avg. Egg Weight"
          />
          <MetricItem
            icon={faBasketShopping}
            value={totalEggsCollected.toLocaleString()}
            label="Eggs Collected (Total)"
          />

          <div
            onClick={!loading ? onManageClick : undefined}
            className={`${
              !loading ? "cursor-pointer hover:shadow-lg" : "cursor-not-allowed"
            }`}
          >
            <MetricItem
              icon={faPlusCircle}
              value={"Log & View Data"}
              label="Manage Egg Records"
            />
          </div>
        </div>
      )}

      {activeView === "graphs" && (
        <div className="flex-grow mt-2" style={{ minHeight: "300px" }}>
          <div className="relative h-full min-h-[250px] sm:min-h-[280px] md:min-h-[320px]">
            <Line options={finalOptions} data={eggCollectionLineData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PoultryEggCard;
