import { faEgg, faKiwiBird } from "@fortawesome/free-solid-svg-icons";
import {
  FontAwesomeIcon,
} from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Pie } from "react-chartjs-2";
import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartData,
  ChartOptions,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

type EggStatItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
};

type Props = {
  totalEggsStock: number;
  totalChicks: number;
  eggGradingPieData: ChartData<"pie">;
  eggGradingPieOptions?: Partial<ChartOptions<"pie">>;
};

const EggStatItem = ({ icon, value, label }: EggStatItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="size-6 text-blue-200 dark:text-blue-400 mb-2"
      aria-hidden="true"
    />
    <p
      className="text-2xl font-semibold text-gray-900 dark:text-white"
      aria-label={`${label} value`}
    >
      {value}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
  </div>
);

const PoultryEggCard = ({
  totalEggsStock,
  totalChicks,
  eggGradingPieData,
  eggGradingPieOptions = {},
}: Props) => {
  const defaultOptions: ChartOptions<"pie"> = {
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
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 12,
        },
        padding: 10,
      },
    },
  };

  const finalOptions = { ...defaultOptions, ...eggGradingPieOptions };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 text-center sm:text-left">
        Egg & Chick Stats
      </h2>

      {/* Grid for the top stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <EggStatItem
          icon={faEgg}
          value={totalEggsStock.toLocaleString()}
          label="Total Eggs (Stock)"
        />
        <EggStatItem
          icon={faKiwiBird}
          value={totalChicks.toLocaleString()}
          label="Active Chicks"
        />
      </div>

      {/* Section for the Pie Chart */}
      <div className="flex-grow flex flex-col">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
          Egg Size Distribution
        </h3>
        <div className="relative flex-grow min-h-[180px] sm:min-h-[200px]">
          <Pie data={eggGradingPieData} options={finalOptions} />
        </div>
      </div>
    </div>
  );
};

export default PoultryEggCard;
