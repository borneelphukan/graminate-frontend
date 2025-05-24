import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react";
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
} from "date-fns";

import PlatformLayout from "@/layout/PlatformLayout";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import TrendGraph from "@/components/cards/finance/TrendGraph";
import CompareGraph from "@/components/cards/finance/CompareGraph";
import WorkingCapital from "@/components/cards/finance/WorkingCapital";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

type SubTypeValue = { name: string; value: number };
type MetricBreakdown = { total: number; breakdown: SubTypeValue[] };
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

const generateDailyFinancialData = (
  count: number,
  subTypes: string[]
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);
  for (let i = 0; i < count; i++) {
    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };
    const baseRevenue = Math.max(1000, 5000 + (Math.random() - 0.5) * 8000);
    const baseCogs = Math.max(500, baseRevenue * (0.2 + Math.random() * 0.5));
    const baseGrossProfit = baseRevenue - baseCogs;
    const baseExpenses = Math.max(
      200,
      Math.abs(baseGrossProfit) *
        (0.1 + Math.random() * 0.6) *
        (baseGrossProfit > 0 ? 1 : 1.5)
    );
    const baseNetProfit = baseGrossProfit - baseExpenses;

    const baseValues: Record<FinancialMetric, number> = {
      Revenue: baseRevenue,
      COGS: baseCogs,
      "Gross Profit": baseGrossProfit,
      Expenses: baseExpenses,
      "Net Profit": baseNetProfit,
    };

    FINANCIAL_METRICS.forEach((metricName) => {
      const key = metricToKeyMap[metricName];
      const totalValue = baseValues[metricName];
      const breakdown: SubTypeValue[] = [];
      if (subTypes.length > 0) {
        let rT = totalValue;
        const nST = subTypes.length;
        subTypes.forEach((sT, idx) => {
          let sTV = 0;
          if (idx === nST - 1) sTV = rT;
          else {
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

  useEffect(() => {
    if (!userId) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const fetchUserDetailsAndGenerateData = async () => {
      let fetchedSubTypes: string[] = [];
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const userData = response.data.user ?? response.data.data?.user;
        if (userData && userData.sub_type) {
          const rawSubTypes = userData.sub_type;
          fetchedSubTypes = Array.isArray(rawSubTypes)
            ? rawSubTypes
            : typeof rawSubTypes === "string"
            ? rawSubTypes.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
        }
      } catch (error) {
        console.error("FinancePage: Error fetching user details:", error);
      }
      setSubTypes(fetchedSubTypes);

      const data = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        fetchedSubTypes
      );
      setFullHistoricalData(data);
      setIsLoadingData(false);
    };

    fetchUserDetailsAndGenerateData();
  }, [userId]);

  const currentMonthCardData = useMemo(() => {
    if (fullHistoricalData.length === 0) {
      return [
        {
          title: "Revenue",
          value: 0,
          icon: faDollarSign,
          bgColor: "bg-green-300 dark:bg-green-800",
          iconValueColor: "text-green-200 dark:text-green-200",
        },
        {
          title: "COGS",
          value: 0,
          icon: faShoppingCart,
          bgColor: "bg-yellow-300 dark:bg-yellow-500",
          iconValueColor: "text-yellow-200 dark:text-yellow-100",
        },
        {
          title: "Gross Profit",
          value: 0,
          icon: faChartPie,
          bgColor: "bg-cyan-300 dark:bg-cyan-600",
          iconValueColor: "text-cyan-200 dark:text-cyan-100",
        },
        {
          title: "Expenses",
          value: 0,
          icon: faCreditCard,
          bgColor: "bg-red-300 dark:bg-red-600",
          iconValueColor: "text-red-200 dark:text-red-100",
        },
        {
          title: "Net Profit",
          value: 0,
          icon: faPiggyBank,
          bgColor: "bg-blue-300 dark:bg-blue-600",
          iconValueColor: "text-blue-200 dark:text-blue-100",
        },
      ];
    }

    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    const currentMonthEntries = fullHistoricalData.filter((entry) =>
      isWithinInterval(entry.date, {
        start: currentMonthStart,
        end: currentMonthEnd,
      })
    );

    let currentMonthRevenue = 0;
    let currentMonthCogs = 0;
    let currentMonthExpenses = 0;
    currentMonthEntries.forEach((entry) => {
      currentMonthRevenue += entry.revenue.total;
      currentMonthCogs += entry.cogs.total;
      currentMonthExpenses += entry.expenses.total;
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
              initialSubTypes={subTypes}
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
