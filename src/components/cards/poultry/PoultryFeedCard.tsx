import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxesStacked,
  faWarehouse,
  faUtensils,
  faChartLine,
  IconDefinition,
  faClipboardList,
  faCubesStacked,
} from "@fortawesome/free-solid-svg-icons";
import {
  parseISO,
  startOfDay,
  isBefore,
  min as minDateFn,
  subDays,
  differenceInDays,
} from "date-fns";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";

type ItemRecord = {
  inventory_id: number;
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  created_at: string;
  price_per_unit: number;
  warehouse_id: number | null;
  minimum_limit?: number;
  status?: string;
  feed?: boolean;
};

type PoultryFeedRecordForGraph = {
  feed_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
}

type FeedItemMetrics = {
  itemName: string;
  currentStockKg: number;
  currentStockDisplay: string;
  avgDailyConsumptionKg: number;
  estimatedDurationDays: number;
  units: string;
}

type Props = {
  feedItems: ItemRecord[];
  feedInventoryDays: number;
  getFeedLevelColor: (days: number) => string;
  loadingFeedItems: boolean;
  avgDailyConsumptionDisplay: string;
  timesFedToday: number;
  targetFeedingsPerDay: number;
  userId: string;
  flockId: string;
};

type FeedStatItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
  children?: React.ReactNode;
  valueClassName?: string;
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const FeedStatItem = ({
  icon,
  value,
  label,
  children,
  valueClassName,
}: FeedStatItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-3 bg-light dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-5 w-5 text-blue-200 dark:text-blue-300 mb-1.5"
      aria-hidden="true"
    />
    <p
      className={`text-lg font-semibold text-dark dark:text-light break-all ${
        valueClassName || ""
      }`}
      aria-label={`${label} value`}
    >
      {value}
    </p>
    <p className="text-xs text-dark dark:text-light">{label}</p>
    {children && <div className="w-full mt-1 pt-0.5">{children}</div>}
  </div>
);

const PoultryFeedCard = ({
  feedItems: stockFeedItems,
  getFeedLevelColor,
  loadingFeedItems: loadingStockItems,
  timesFedToday,
  targetFeedingsPerDay,
  userId,
  flockId,
}: Props) => {
  const router = useRouter();

  const [allFeedConsumptionRecords, setAllFeedConsumptionRecords] = useState<
    PoultryFeedRecordForGraph[]
  >([]);
  const [loadingConsumptionRecords, setLoadingConsumptionRecords] =
    useState(true);

  const [perFeedItemMetrics, setPerFeedItemMetrics] = useState<
    FeedItemMetrics[]
  >([]);
  const [loadingPerItemMetrics, setLoadingPerItemMetrics] = useState(true);

  const convertAmountToKg = (amount: number, unit: string): number => {
    const unitLower = unit ? unit.toLowerCase() : "";
    if (unitLower === "kg") return amount;
    if (unitLower === "g" || unitLower === "grams") return amount / 1000;
    if (unitLower === "lbs" || unitLower === "pounds") return amount * 0.453592;
    if (unitLower && unitLower !== "") {
      console.warn(
        `Unit "${unit}" is not recognized for KG conversion. Amount ${amount} treated as 0kg for this calculation.`
      );
    }
    return 0;
  };

  const fetchAllFeedConsumptionData = useCallback(async () => {
    if (!userId || !flockId) {
      setLoadingConsumptionRecords(false);
      return;
    }
    setLoadingConsumptionRecords(true);
    try {
      const response = await axiosInstance.get<{
        records: PoultryFeedRecordForGraph[];
      }>(`/poultry-feeds/${userId}?flockId=${flockId}&limit=10000`);
      const fetchedRecords = response.data.records || [];
      setAllFeedConsumptionRecords(fetchedRecords);
    } catch (error) {
      console.error("Error fetching all poultry feed consumption data:", error);
      setAllFeedConsumptionRecords([]);
    } finally {
      setLoadingConsumptionRecords(false);
    }
  }, [userId, flockId]);

  useEffect(() => {
    fetchAllFeedConsumptionData();
  }, [fetchAllFeedConsumptionData]);

  useEffect(() => {
    if (loadingStockItems || loadingConsumptionRecords) {
      setLoadingPerItemMetrics(true);
      return;
    }
    setLoadingPerItemMetrics(true);
    const thirtyDaysAgo = startOfDay(subDays(today, 29));

    const calculatedMetrics: FeedItemMetrics[] = stockFeedItems.map(
      (stockItem) => {
        const consumptionForThisItem = allFeedConsumptionRecords.filter(
          (record) =>
            record.feed_given === stockItem.item_name &&
            isBefore(thirtyDaysAgo, startOfDay(parseISO(record.feed_date)))
        );

        let totalKgConsumedForItemLast30Days = 0;
        consumptionForThisItem.forEach((record) => {
          totalKgConsumedForItemLast30Days += convertAmountToKg(
            record.amount_given,
            record.units
          );
        });

        const earliestRecordDateForItemInPeriod =
          consumptionForThisItem.length > 0
            ? minDateFn(
                consumptionForThisItem.map((r) => parseISO(r.feed_date))
              )
            : thirtyDaysAgo;

        const daysInPeriodWithDataForItem = Math.max(
          1,
          differenceInDays(today, earliestRecordDateForItemInPeriod) + 1
        );

        const avgDailyConsumptionKgForItem =
          consumptionForThisItem.length > 0
            ? totalKgConsumedForItemLast30Days /
              Math.min(30, daysInPeriodWithDataForItem)
            : 0;

        const currentStockKg = convertAmountToKg(
          stockItem.quantity,
          stockItem.units
        );
        const estimatedDurationDays =
          avgDailyConsumptionKgForItem > 0 &&
          isFinite(avgDailyConsumptionKgForItem)
            ? currentStockKg / avgDailyConsumptionKgForItem
            : currentStockKg > 0
            ? Infinity
            : 0;

        return {
          itemName: stockItem.item_name,
          currentStockKg: currentStockKg,
          currentStockDisplay: `${stockItem.quantity.toLocaleString()} ${
            stockItem.units
          }`,
          avgDailyConsumptionKg: avgDailyConsumptionKgForItem,
          estimatedDurationDays: estimatedDurationDays,
          units: stockItem.units,
        };
      }
    );
    setPerFeedItemMetrics(calculatedMetrics);
    setLoadingPerItemMetrics(false);
  }, [
    stockFeedItems,
    allFeedConsumptionRecords,
    loadingStockItems,
    loadingConsumptionRecords,
  ]);

  const handleManageFeedClick = () => {
    if (!loadingStockItems && userId && flockId) {
      router.push(
        `/platform/${userId}/poultry/poultry-feeds?flock_id=${flockId}`
      );
    }
  };

  const feedingStatusValue = `${timesFedToday} / ${targetFeedingsPerDay}`;
  const isFeedingComplete = timesFedToday >= targetFeedingsPerDay;
  const feedingStatusColor = isFeedingComplete
    ? "text-green-200"
    : timesFedToday > 0
    ? "text-yellow-200"
    : "text-red-200";

  const renderMetricsView = () => {
    if (loadingStockItems || loadingPerItemMetrics) {
      return (
        <div className="flex justify-center items-center h-full min-h-[200px]">
          <Loader />
        </div>
      );
    }

    if (stockFeedItems.length === 0 && !loadingStockItems) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center min-h-[200px] py-4">
          <FontAwesomeIcon
            icon={faBoxesStacked}
            className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3"
          />
          <p className="text-gray-500 dark:text-gray-400 text-md font-semibold">
            No Poultry Feed in Stock
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Mark items as "Feed" in your inventory.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-3 flex flex-col">
        <div className="overflow-y-auto max-h-[280px] space-y-3 pr-2 custom-scrollbar-sm mb-1">
          {perFeedItemMetrics.map((metric) => {
            const durationColorClass = getFeedLevelColor(
              metric.estimatedDurationDays
            );
            const durationBgColorClass = durationColorClass.replace(
              "text-",
              "bg-"
            );
            const durationDisplay = !isFinite(metric.estimatedDurationDays)
              ? "To be declared"
              : metric.estimatedDurationDays.toFixed(1) + " days";

            return (
              <div
                key={metric.itemName}
                className="p-3 bg-light dark:bg-gray-700 rounded-lg shadow-sm"
              >
                <h4 className="text-md font-semibold text-dark dark:text-light mb-2 truncate">
                  {metric.itemName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col items-center rounded">
                    <FontAwesomeIcon
                      icon={faCubesStacked}
                      className="h-4 w-4 text-blue-200 dark:text-blue-300 mb-1"
                    />
                    <span className="font-semibold text-sm text-dark dark:text-light">
                      {metric.currentStockDisplay}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      In Stock
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <FontAwesomeIcon
                      icon={faChartLine}
                      className="h-4 w-4 text-blue-200 dark:text-blue-300 mb-1"
                    />
                    <span className="font-semibold text-sm text-dark dark:text-light">
                      {metric.avgDailyConsumptionKg.toFixed(2)} kg/day
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Avg. Daily Use
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <FontAwesomeIcon
                      icon={faWarehouse}
                      className="h-4 w-4 text-blue-200 dark:text-blue-300 mb-2"
                    />
                    <span
                      className={`font-semibold text-sm ${durationColorClass}`}
                    >
                      {durationDisplay}
                    </span>
                    <span className="text-gray-600 text-xs dark:text-gray-400">
                      Estimated Duration
                    </span>
                    {isFinite(metric.estimatedDurationDays) &&
                      metric.estimatedDurationDays >= 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-500 overflow-hidden mt-1">
                          <div
                            className={`h-1.5 rounded-full ${durationBgColorClass}`}
                            style={{
                              width: `${Math.min(
                                100,
                                (metric.estimatedDurationDays / 7) * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          <FeedStatItem
            icon={faUtensils}
            value={loadingStockItems ? <Loader /> : feedingStatusValue}
            label="Times Fed Today"
            valueClassName={feedingStatusColor}
          />
          <div
            onClick={!loadingStockItems ? handleManageFeedClick : undefined}
            className={`${
              !loadingStockItems && userId && flockId
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-70"
            }`}
          >
            <FeedStatItem
              icon={faClipboardList}
              value={"Log/View All"}
              label="Manage Feed Data"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-1">
        <h2 className="text-xl font-semibold text-dark dark:text-light text-center sm:text-left mb-2 sm:mb-0">
          Feed Status & Consumption
        </h2>
      </div>
      {renderMetricsView()}
    </div>
  );
};

export default PoultryFeedCard;
