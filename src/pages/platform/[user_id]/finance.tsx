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
  parseISO,
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

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
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

type SaleRecord = {
  sales_id: number;
  user_id: number;
  sales_name?: string;
  sales_date: string;
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
  quantity_unit?: string;
  invoice_created: boolean;
  created_at: string;
};

type ExpenseRecord = {
  expense_id: number;
  user_id: number;
  title: string;
  occupation?: string;
  category: string;
  expense: number;
  date_created: string;
  created_at: string;
};

const DETAILED_EXPENSE_CATEGORIES = {
  "Goods & Services": ["Farm Utilities", "Agricultural Feeds", "Consulting"],
  "Utility Expenses": [
    "Electricity",
    "Labour Salary",
    "Water Supply",
    "Taxes",
    "Others",
  ],
};

const EXPENSE_TYPE_MAP = {
  COGS: "Goods & Services",
  OPERATING_EXPENSES: "Utility Expenses",
};

const categoryToMainGroup: Record<string, string> = {};
for (const mainGroup in DETAILED_EXPENSE_CATEGORIES) {
  DETAILED_EXPENSE_CATEGORIES[
    mainGroup as keyof typeof DETAILED_EXPENSE_CATEGORIES
  ].forEach((subCat) => {
    categoryToMainGroup[subCat] = mainGroup;
  });
}

type ProcessedExpensesForDay = {
  cogs: MetricBreakdown;
  expenses: MetricBreakdown;
};

const generateDailyFinancialData = (
  count: number,
  baseSubTypes: string[],
  actualSalesData?: Map<string, MetricBreakdown>,
  actualProcessedExpenses?: Map<string, ProcessedExpensesForDay>
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);

  const allOccupations = new Set<string>(baseSubTypes);
  if (actualSalesData) {
    actualSalesData.forEach((dayData) =>
      dayData.breakdown.forEach((bd) => allOccupations.add(bd.name))
    );
  }
  if (actualProcessedExpenses) {
    actualProcessedExpenses.forEach((dayData) => {
      dayData.cogs.breakdown.forEach((bd) => allOccupations.add(bd.name));
      dayData.expenses.breakdown.forEach((bd) => allOccupations.add(bd.name));
    });
  }
  if (allOccupations.size === 0 && baseSubTypes.length === 0) {
    allOccupations.add("Uncategorized");
  }
  const finalOccupationsList = Array.from(allOccupations);

  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");

    const actualRevenueForDay = actualSalesData?.get(dateKey);
    const actualExpensesForDay = actualProcessedExpenses?.get(dateKey);

    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };

    dailyEntry.revenue = actualRevenueForDay || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };

    dailyEntry.cogs = actualExpensesForDay?.cogs || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };

    dailyEntry.expenses = actualExpensesForDay?.expenses || {
      total: 0,
      breakdown: finalOccupationsList.map((occ) => ({ name: occ, value: 0 })),
    };

    const grossProfitTotal = dailyEntry.revenue.total - dailyEntry.cogs.total;
    const grossProfitBreakdown: SubTypeValue[] = finalOccupationsList.map(
      (occName) => {
        const revVal =
          dailyEntry.revenue!.breakdown.find((b) => b.name === occName)
            ?.value || 0;
        const cogsVal =
          dailyEntry.cogs!.breakdown.find((b) => b.name === occName)?.value ||
          0;
        return { name: occName, value: revVal - cogsVal };
      }
    );
    dailyEntry.grossProfit = {
      total: grossProfitTotal,
      breakdown: grossProfitBreakdown,
    };

    const netProfitTotal = grossProfitTotal - dailyEntry.expenses.total;
    const netProfitBreakdown: SubTypeValue[] = finalOccupationsList.map(
      (occName) => {
        const gpVal =
          grossProfitBreakdown.find((b) => b.name === occName)?.value || 0;
        const expVal =
          dailyEntry.expenses!.breakdown.find((b) => b.name === occName)
            ?.value || 0;
        return { name: occName, value: gpVal - expVal };
      }
    );
    dailyEntry.netProfit = {
      total: netProfitTotal,
      breakdown: netProfitBreakdown,
    };

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
      const occupationsEncountered = new Set<string>(userSubTypes);

      sales.forEach((sale) => {
        const occupation = sale.occupation || "Uncategorized";
        occupationsEncountered.add(occupation);
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);

      sales.forEach((sale) => {
        const saleDate = parseISO(sale.sales_date);
        const saleDateStr = formatDateFns(saleDate, "yyyy-MM-dd");

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

        const occupation = sale.occupation || "Uncategorized";

        if (!dailyRevenueMap.has(saleDateStr)) {
          dailyRevenueMap.set(saleDateStr, {
            total: 0,
            breakdown: allRelevantOccupations.map((st) => ({
              name: st,
              value: 0,
            })),
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
          // This should ideally not happen if allRelevantOccupations is comprehensive
          const newOccEntry = { name: occupation, value: totalSaleAmount };
          dayData.breakdown.push(newOccEntry);
          if (!allRelevantOccupations.includes(occupation))
            allRelevantOccupations.push(occupation); // ensure master list has it
        }
      });
      return dailyRevenueMap;
    },
    []
  );

  const processExpensesData = useCallback(
    (
      expenses: ExpenseRecord[],
      userSubTypes: string[]
    ): Map<string, ProcessedExpensesForDay> => {
      const dailyExpensesMap = new Map<string, ProcessedExpensesForDay>();
      const occupationsEncountered = new Set<string>(userSubTypes);

      expenses.forEach((expense) => {
        const occupation = expense.occupation || "Uncategorized";
        occupationsEncountered.add(occupation);
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);

      expenses.forEach((expense) => {
        const expenseDate = parseISO(expense.date_created);
        const expenseDateStr = formatDateFns(expenseDate, "yyyy-MM-dd");
        const expenseAmount = Number(expense.expense) || 0;
        const occupation = expense.occupation || "Uncategorized";

        const mainCategoryGroup = categoryToMainGroup[expense.category];
        let expenseType: "cogs" | "expenses" | null = null;

        if (mainCategoryGroup === EXPENSE_TYPE_MAP.COGS) {
          expenseType = "cogs";
        } else if (mainCategoryGroup === EXPENSE_TYPE_MAP.OPERATING_EXPENSES) {
          expenseType = "expenses";
        }

        if (!expenseType) return;

        if (!dailyExpensesMap.has(expenseDateStr)) {
          dailyExpensesMap.set(expenseDateStr, {
            cogs: {
              total: 0,
              breakdown: allRelevantOccupations.map((st) => ({
                name: st,
                value: 0,
              })),
            },
            expenses: {
              total: 0,
              breakdown: allRelevantOccupations.map((st) => ({
                name: st,
                value: 0,
              })),
            },
          });
        }

        const dayDataContainer = dailyExpensesMap.get(expenseDateStr)!;
        const targetMetricBreakdown = dayDataContainer[expenseType];

        targetMetricBreakdown.total += expenseAmount;
        let occupationEntry = targetMetricBreakdown.breakdown.find(
          (b) => b.name === occupation
        );

        if (occupationEntry) {
          occupationEntry.value += expenseAmount;
        } else {
          const newOccEntry = { name: occupation, value: expenseAmount };
          targetMetricBreakdown.breakdown.push(newOccEntry);
          if (!allRelevantOccupations.includes(occupation))
            allRelevantOccupations.push(occupation);
        }
      });
      return dailyExpensesMap;
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
      let processedExpensesMap: Map<string, ProcessedExpensesForDay> =
        new Map();
      let finalSubTypesList: string[] = [];

      try {
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
        finalSubTypesList = [...fetchedSubTypes];

        const salesPromise = axiosInstance.get<{ sales: SaleRecord[] }>(
          `/sales/user/${userId}`
        );
        const expensesPromise = axiosInstance.get<{
          expenses: ExpenseRecord[];
        }>(`/expenses/user/${userId}`);

        const [salesResponse, expensesResponse] = await Promise.all([
          salesPromise,
          expensesPromise,
        ]);

        const salesRecords = salesResponse.data.sales || [];
        processedSalesRevenueMap = processSalesData(
          salesRecords,
          fetchedSubTypes
        );

        salesRecords.forEach((s) => {
          const occ = s.occupation || "Uncategorized";
          if (!finalSubTypesList.includes(occ)) finalSubTypesList.push(occ);
        });

        const expenseRecords = expensesResponse.data.expenses || [];
        processedExpensesMap = processExpensesData(
          expenseRecords,
          fetchedSubTypes
        );

        expenseRecords.forEach((e) => {
          const occ = e.occupation || "Uncategorized";
          if (!finalSubTypesList.includes(occ)) finalSubTypesList.push(occ);
        });

        setSubTypes(Array.from(new Set(finalSubTypesList)));
      } catch (error) {
        console.error("FinancePage: Error fetching initial data:", error);
        Swal.fire("Error", "Could not load initial financial data.", "error");
      }

      const generatedData = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        finalSubTypesList.length > 0 ? finalSubTypesList : ["Uncategorized"], // Pass the most comprehensive list
        processedSalesRevenueMap,
        processedExpensesMap
      );
      setFullHistoricalData(generatedData);
      setIsLoadingData(false);
    };

    fetchInitialData();
  }, [userId, processSalesData, processExpensesData]);

  const currentMonthCardData = useMemo(() => {
    if (fullHistoricalData.length === 0) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: metric,
        value: 0,
        icon: faDollarSign,
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }

    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);

    let currentMonthRevenue = 0;
    let currentMonthCogs = 0;
    let currentMonthExpenses = 0;

    fullHistoricalData.forEach((entry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        currentMonthRevenue += entry.revenue.total;
        currentMonthCogs += entry.cogs.total;
        currentMonthExpenses += entry.expenses.total;
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
