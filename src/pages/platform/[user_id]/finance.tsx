import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  faDollarSign,
  faShoppingCart,
  faChartPie,
  faCreditCard,
  faPiggyBank,
} from "@fortawesome/free-solid-svg-icons";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays as subDaysDateFns,
  addDays as addDaysDateFns,
  format as formatDateFns,
  isSameDay,
} from "date-fns";

import PlatformLayout from "@/layout/PlatformLayout";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import TrendGraph from "@/components/cards/finance/TrendGraph";
import CompareGraph from "@/components/cards/finance/CompareGraph";
import WorkingCapital from "@/components/cards/finance/WorkingCapital";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import Swal from "sweetalert2";

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180; // How far back to generate placeholder data
const today = new Date();
today.setHours(0, 0, 0, 0);

type SubTypeValue = { name: string; value: number };
export type MetricBreakdown = { total: number; breakdown: SubTypeValue[] };
export type DailyFinancialEntry = {
  date: Date;
  revenue: MetricBreakdown;
  cogs: MetricBreakdown;
  grossProfit: MetricBreakdown;
  expenses: MetricBreakdown;
  netProfit: MetricBreakdown;
};
const metricToKeyMap: Record<
  FinancialMetric,
  keyof Omit<DailyFinancialEntry, "date">
> = {
  Revenue: "revenue",
  COGS: "cogs",
  "Gross Profit": "grossProfit",
  Expenses: "expenses",
  "Net Profit": "netProfit",
};

// Type for fetched sales data
type SaleRecord = {
  sales_id: number;
  user_id: number;
  sales_name?: string;
  sales_date: string; // Expecting YYYY-MM-DD string from backend
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
  quantity_unit?: string;
  invoice_created: boolean;
  created_at: string;
};

const generatePlaceholderDailyFinancialData = (
  count: number,
  subTypes: string[],
  actualSalesData?: Map<string, MetricBreakdown> // Date string to Revenue MetricBreakdown
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);

  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");
    const actualRevenueForDay = actualSalesData?.get(dateKey);

    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };

    let baseRevenue: number;
    let revenueBreakdown: SubTypeValue[] = [];

    if (actualRevenueForDay) {
      baseRevenue = actualRevenueForDay.total;
      revenueBreakdown = actualRevenueForDay.breakdown;
    } else {
      baseRevenue = 0; // Default to 0 if no actual sales
      if (subTypes.length > 0) {
        revenueBreakdown = subTypes.map((st) => ({ name: st, value: 0 }));
      }
    }

    dailyEntry.revenue = { total: baseRevenue, breakdown: revenueBreakdown };

    // For other metrics, use placeholder logic or set to 0 if not using placeholders
    const baseCogs = baseRevenue * 0.4; // Placeholder COGS
    const baseGrossProfit = baseRevenue - baseCogs;
    const baseExpenses = baseGrossProfit * 0.3; // Placeholder Expenses
    const baseNetProfit = baseGrossProfit - baseExpenses;

    const placeholderBaseValues: Record<
      Exclude<FinancialMetric, "Revenue">,
      number
    > = {
      COGS: baseCogs,
      "Gross Profit": baseGrossProfit,
      Expenses: baseExpenses,
      "Net Profit": baseNetProfit,
    };

    (
      Object.keys(placeholderBaseValues) as Exclude<
        FinancialMetric,
        "Revenue"
      >[]
    ).forEach((metricName) => {
      const key = metricToKeyMap[metricName];
      const totalValue = placeholderBaseValues[metricName];
      const breakdown: SubTypeValue[] = [];
      if (subTypes.length > 0) {
        let rT = totalValue;
        const nST = subTypes.length;
        subTypes.forEach((sT, idx) => {
          let sTV = 0;
          if (idx === nST - 1) sTV = rT;
          else {
            // Distribute placeholder values somewhat randomly
            const p = (0.5 + Math.random()) / nST;
            sTV =
              totalValue < 0
                ? Math.min(0, totalValue * p)
                : Math.max(0, totalValue * p);
            if (totalValue >= 0 && rT - sTV < 0 && nST > 1)
              sTV = Math.max(0, rT * Math.random());
            if (totalValue < 0 && rT - sTV > 0 && nST > 1)
              sTV = Math.min(0, rT * Math.random());
          }
          sTV = parseFloat(sTV.toFixed(2));
          breakdown.push({ name: sT, value: sTV });
          rT -= sTV;
        });
        const bS = breakdown.reduce((a, c) => a + c.value, 0);
        if (Math.abs(bS - totalValue) > 0.01 && breakdown.length > 0) {
          const df = totalValue - bS;
          breakdown[breakdown.length - 1].value += df;
          breakdown[breakdown.length - 1].value = parseFloat(
            breakdown[breakdown.length - 1].value.toFixed(2)
          );
        }
      }
      (dailyEntry[key] as MetricBreakdown) = {
        total: parseFloat(totalValue.toFixed(2)),
        breakdown,
      };
    });
    data.push(dailyEntry as DailyFinancialEntry);
    loopDate = addDaysDateFns(loopDate, 1);
  }
  return data;
};

const Finance = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;

  const currentDate = new Date();

  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);

  const processSalesData = useCallback(
    (
      sales: SaleRecord[],
      userSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();

      sales.forEach((sale) => {
        const saleDateStr = formatDateFns(
          new Date(sale.sales_date),
          "yyyy-MM-dd"
        );
        let totalSaleAmount = 0;

        if (
          sale.items_sold &&
          sale.quantities_sold &&
          sale.prices_per_unit &&
          sale.items_sold.length === sale.quantities_sold.length &&
          sale.items_sold.length === sale.prices_per_unit.length
        ) {
          for (let i = 0; i < sale.items_sold.length; i++) {
            totalSaleAmount +=
              (sale.quantities_sold[i] || 0) * (sale.prices_per_unit[i] || 0);
          }
        }

        const occupation = sale.occupation || "Uncategorized"; // Default if no occupation

        if (!dailyRevenueMap.has(saleDateStr)) {
          const initialBreakdown = userSubTypes.map((st) => ({
            name: st,
            value: 0,
          }));
          if (
            !userSubTypes.includes("Uncategorized") &&
            occupation === "Uncategorized"
          ) {
            initialBreakdown.push({ name: "Uncategorized", value: 0 });
          }
          dailyRevenueMap.set(saleDateStr, {
            total: 0,
            breakdown: initialBreakdown,
          });
        }

        const dayData = dailyRevenueMap.get(saleDateStr)!;
        dayData.total += totalSaleAmount;

        let occupationEntry = dayData.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) {
          occupationEntry.value += totalSaleAmount;
        } else {
          // This case should be rare if "Uncategorized" is handled above.
          dayData.breakdown.push({ name: occupation, value: totalSaleAmount });
        }
      });
      return dailyRevenueMap;
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const fetchInitialData = async () => {
      let fetchedSubTypes: string[] = [];
      let processedSalesRevenueMap: Map<string, MetricBreakdown> = new Map();

      try {
        // Fetch user details first to get sub_types
        const userResponse = await axiosInstance.get(`/user/${userId}`);
        const userData = userResponse.data.user ?? userResponse.data.data?.user;
        if (userData && userData.sub_type) {
          const rawSubTypes = userData.sub_type;
          fetchedSubTypes = Array.isArray(rawSubTypes)
            ? rawSubTypes
            : typeof rawSubTypes === "string"
            ? rawSubTypes.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
        }
        setSubTypes(fetchedSubTypes);

        // Then fetch sales data
        const salesResponse = await axiosInstance.get<{ sales: SaleRecord[] }>(
          `/sales/user/${userId}`
        );
        const salesRecords = salesResponse.data.sales || [];
        processedSalesRevenueMap = processSalesData(
          salesRecords,
          fetchedSubTypes
        );
      } catch (error) {
        console.error("FinancePage: Error fetching initial data:", error);
        Swal.fire("Error", "Could not load initial financial data.", "error");
      }

      const generatedData = generatePlaceholderDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        fetchedSubTypes,
        processedSalesRevenueMap
      );
      setFullHistoricalData(generatedData);
      setIsLoadingData(false);
    };

    fetchInitialData();
  }, [userId, processSalesData]);

  const currentMonthCardData = useMemo(() => {
    if (fullHistoricalData.length === 0) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: metric,
        value: 0,
        icon: faDollarSign, // Default icon
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }

    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);

    let currentMonthRevenue = 0;
    let currentMonthCogs = 0; // Placeholder
    let currentMonthExpenses = 0; // Placeholder

    fullHistoricalData.forEach((entry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        currentMonthRevenue += entry.revenue.total;
        currentMonthCogs += entry.cogs.total; // Using placeholder cogs
        currentMonthExpenses += entry.expenses.total; // Using placeholder expenses
      }
    });

    const currentMonthGrossProfit = currentMonthRevenue - currentMonthCogs;
    const currentMonthNetProfit =
      currentMonthGrossProfit - currentMonthExpenses;

    return [
      {
        title: "Revenue",
        value: currentMonthRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-800",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: "COGS",
        value: currentMonthCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-500",
        iconValueColor: "text-yellow-200 dark:text-yellow-100",
      },
      {
        title: "Gross Profit",
        value: currentMonthGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-600",
        iconValueColor: "text-cyan-200 dark:text-cyan-100",
      },
      {
        title: "Expenses",
        value: currentMonthExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-600",
        iconValueColor: "text-red-200 dark:text-red-100",
      },
      {
        title: "Net Profit",
        value: currentMonthNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-600",
        iconValueColor: "text-blue-200 dark:text-blue-100",
      },
    ];
  }, [fullHistoricalData, currentDate]);

  return (
    <>
      <Head>
        <title> Graminate | Finance Dashboard</title>
        <meta
          name="description"
          content="Track and manage your farm finances"
        />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <h1 className="text-xl font-semibold dark:text-white ml-3">
                Finance Dashboard
              </h1>
            </div>
          </header>

          {isLoadingData ? (
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-36 flex items-center justify-center"
                  >
                    <Loader />
                  </div>
                ))}
            </div>
          ) : (
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {currentMonthCardData.map((card, index) => (
                <BudgetCard
                  key={index}
                  title={card.title}
                  value={card.value}
                  date={currentDate}
                  icon={card.icon}
                  bgColor={card.bgColor}
                  iconValueColor={card.iconValueColor}
                />
              ))}
            </div>
          )}

          <div className="mt-8">
            <TrendGraph
              initialFullHistoricalData={fullHistoricalData}
              initialSubTypes={subTypes} // Pass actual subTypes
              isLoadingData={isLoadingData}
            />
          </div>

          <div className="mt-8">
            <CompareGraph
              initialFullHistoricalData={fullHistoricalData}
              isLoadingData={isLoadingData}
            />
          </div>

          <div className="mt-8">
            <WorkingCapital />
          </div>
        </main>
      </PlatformLayout>
    </>
  );
};

export default Finance;
