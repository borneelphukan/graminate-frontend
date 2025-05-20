import {
  faBoxesStacked,
  faBowlFood,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type Props = {
  dailyFeedConsumption: number;
  feedInventoryDays: number;
  getFeedLevelColor: (days: number) => string;
};

type FeedStatItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
  children?: React.ReactNode;
};

const FeedStatItem = ({ icon, value, label, children }: FeedStatItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-400 mb-2"
      aria-hidden="true"
    />
    <p
      className="text-2xl font-semibold text-gray-900 dark:text-white"
      aria-label={`${label} value`}
    >
      {value}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    {children && <div className="w-full mt-2 pt-1">{children}</div>}
  </div>
);

const PoultryFeedCard = ({
  dailyFeedConsumption,
  feedInventoryDays,
  getFeedLevelColor,
}: Props) => {
  const inventoryColorClass = getFeedLevelColor(feedInventoryDays);
  const inventoryBgColorClass = inventoryColorClass.replace("text-", "bg-");

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 text-center sm:text-left">
        Feed Status
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <FeedStatItem
          icon={faBowlFood}
          value={`${dailyFeedConsumption.toFixed(1)} kg`}
          label="Daily Consumption"
        />
        <FeedStatItem
          icon={faBoxesStacked}
          value={
            <span className={`font-semibold ${inventoryColorClass}`}>
              {feedInventoryDays.toFixed(1)} days
            </span>
          }
          label="Inventory Level"
        >
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${inventoryBgColorClass} transition-all duration-500 ease-out`}
              style={{
                width: `${Math.min(100, (feedInventoryDays / 7) * 100)}%`,
              }}
              role="progressbar"
              aria-valuenow={feedInventoryDays}
              aria-valuemin={0}
              aria-valuemax={7}
              aria-label="Feed inventory level progress"
            ></div>
          </div>
        </FeedStatItem>
      </div>
    </div>
  );
};

export default PoultryFeedCard;
