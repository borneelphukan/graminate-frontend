import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  faDollarSign,
  faShoppingCart,
  faChartPie,
  faCreditCard,
  faPiggyBank,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays as subDaysDateFns,
  addDays as addDaysDateFns,
  format as formatDateFns,
  parseISO,
} from "date-fns";

import PlatformLayout from "@/layout/PlatformLayout";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import Swal from "sweetalert2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;

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

type SaleRecordForRevenue = {
  sales_id: number;
  sales_date: string;
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
};

type ExpenseRecordForApiculture = {
  expense_id: number;
  occupation?: string;
  category: string;
  expense: number;
  date_created: string;
};

const TARGET_APICULTURE_SUB_TYPE = "Apiculture";

const DETAILED_EXPENSE_CATEGORIES_APICULTURE = {
  "Goods & Services": ["Farm Utilities", "Agricultural Feeds", "Consulting"],
  "Utility Expenses": [
    "Electricity",
    "Labour Salary",
    "Water Supply",
    "Taxes",
    "Others",
  ],
};

const EXPENSE_TYPE_MAP_APICULTURE = {
  COGS: "Goods & Services",
  OPERATING_EXPENSES: "Utility Expenses",
};

const categoryToMainGroupApiculture: Record<string, string> = {};
for (const mainGroup in DETAILED_EXPENSE_CATEGORIES_APICULTURE) {
  DETAILED_EXPENSE_CATEGORIES_APICULTURE[
    mainGroup as keyof typeof DETAILED_EXPENSE_CATEGORIES_APICULTURE
  ].forEach((subCat) => {
    categoryToMainGroupApiculture[subCat] = mainGroup;
  });
}

type ProcessedExpensesForDayApiculture = {
  cogs: MetricBreakdown;
  expenses: MetricBreakdown;
};

const generateDailyFinancialDataWithActualsApiculture = (
  count: number,
  userSubTypes: string[],
  actualSalesRevenueMap?: Map<string, MetricBreakdown>,
  actualProcessedExpenses?: Map<string, ProcessedExpensesForDayApiculture>
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);

  const allPossibleBreakdownNames = [
    ...new Set([...userSubTypes, TARGET_APICULTURE_SUB_TYPE, "Uncategorized"]),
  ];

  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");

    const actualRevenueForDay = actualSalesRevenueMap?.get(dateKey);
    const actualExpensesForDay = actualProcessedExpenses?.get(dateKey);

    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };

    dailyEntry.revenue = actualRevenueForDay || {
      total: 0,
      breakdown: allPossibleBreakdownNames.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    dailyEntry.cogs = actualExpensesForDay?.cogs || {
      total: 0,
      breakdown: allPossibleBreakdownNames.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    dailyEntry.expenses = actualExpensesForDay?.expenses || {
      total: 0,
      breakdown: allPossibleBreakdownNames.map((occ) => ({
        name: occ,
        value: 0,
      })),
    };

    const grossProfitTotal = dailyEntry.revenue.total - dailyEntry.cogs.total;
    const grossProfitBreakdown: SubTypeValue[] = allPossibleBreakdownNames.map(
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
    const netProfitBreakdown: SubTypeValue[] = allPossibleBreakdownNames.map(
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

const Apiculture = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;

  const [isLoadingOverall, setIsLoadingOverall] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);
  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = new Date();
  const [userSubTypes, setUserSubTypes] = useState<string[]>([]);

  const processSalesDataForRevenue = useCallback(
    (
      sales: SaleRecordForRevenue[],
      allUserSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();
      const subTypesIncludingTargetAndUncategorized = [
        ...new Set([
          ...allUserSubTypes,
          TARGET_APICULTURE_SUB_TYPE,
          "Uncategorized",
        ]),
      ];

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
          const initialBreakdown = subTypesIncludingTargetAndUncategorized.map(
            (st) => ({ name: st, value: 0 })
          );
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
          dayData.breakdown.push({ name: occupation, value: totalSaleAmount });
        }
      });
      return dailyRevenueMap;
    },
    []
  );

  const processExpensesDataForApiculture = useCallback(
    (
      expenses: ExpenseRecordForApiculture[],
      allUserSubTypes: string[]
    ): Map<string, ProcessedExpensesForDayApiculture> => {
      const dailyExpensesMap = new Map<
        string,
        ProcessedExpensesForDayApiculture
      >();
      const subTypesIncludingTargetAndUncategorized = [
        ...new Set([
          ...allUserSubTypes,
          TARGET_APICULTURE_SUB_TYPE,
          "Uncategorized",
        ]),
      ];

      expenses.forEach((expense) => {
        const expenseDate = parseISO(expense.date_created);
        const expenseDateStr = formatDateFns(expenseDate, "yyyy-MM-dd");
        const expenseAmount = Number(expense.expense) || 0;
        const occupation = expense.occupation || "Uncategorized";

        const mainCategoryGroup =
          categoryToMainGroupApiculture[expense.category];
        let expenseType: "cogs" | "expenses" | null = null;

        if (mainCategoryGroup === EXPENSE_TYPE_MAP_APICULTURE.COGS) {
          expenseType = "cogs";
        } else if (
          mainCategoryGroup === EXPENSE_TYPE_MAP_APICULTURE.OPERATING_EXPENSES
        ) {
          expenseType = "expenses";
        }

        if (!expenseType) return;

        if (!dailyExpensesMap.has(expenseDateStr)) {
          dailyExpensesMap.set(expenseDateStr, {
            cogs: {
              total: 0,
              breakdown: subTypesIncludingTargetAndUncategorized.map((st) => ({
                name: st,
                value: 0,
              })),
            },
            expenses: {
              total: 0,
              breakdown: subTypesIncludingTargetAndUncategorized.map((st) => ({
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
        }
      });
      return dailyExpensesMap;
    },
    []
  );

  useEffect(() => {
    if (!parsedUserId) {
      setIsLoadingOverall(false);
      return;
    }
    setIsLoadingOverall(true);
    const fetchAllApicultureData = async () => {
      let fetchedUserSubTypesInternal: string[] = [];
      let processedSalesRevenueMap: Map<string, MetricBreakdown> = new Map();
      let processedExpensesMap: Map<string, ProcessedExpensesForDayApiculture> =
        new Map();

      try {
        const userPromise = axiosInstance.get(`/user/${parsedUserId}`);
        const salesPromise = axiosInstance.get<{
          sales: SaleRecordForRevenue[];
        }>(`/sales/user/${parsedUserId}`);
        const expensesPromise = axiosInstance.get<{
          expenses: ExpenseRecordForApiculture[];
        }>(`/expenses/user/${parsedUserId}`);

        const [userResponse, salesResponse, expensesResponse] =
          await Promise.all([userPromise, salesPromise, expensesPromise]);

        const userData = userResponse.data.user ?? userResponse.data.data?.user;
        if (userData && userData.sub_type) {
          const rawSubTypes = userData.sub_type;
          fetchedUserSubTypesInternal = Array.isArray(rawSubTypes)
            ? rawSubTypes
            : typeof rawSubTypes === "string"
            ? rawSubTypes.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
        }
        setUserSubTypes(fetchedUserSubTypesInternal);

        const salesRecords = salesResponse.data.sales || [];
        processedSalesRevenueMap = processSalesDataForRevenue(
          salesRecords,
          fetchedUserSubTypesInternal
        );

        const expenseRecords = expensesResponse.data.expenses || [];
        processedExpensesMap = processExpensesDataForApiculture(
          expenseRecords,
          fetchedUserSubTypesInternal
        );
      } catch (error) {
        console.error("ApiculturePage: Error fetching data:", error);
        Swal.fire("Error", "Could not load Apiculture data.", "error");
      }

      const subTypesForGeneration = [
        ...new Set([
          ...fetchedUserSubTypesInternal,
          TARGET_APICULTURE_SUB_TYPE,
          "Uncategorized",
        ]),
      ];
      const financialData = generateDailyFinancialDataWithActualsApiculture(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        subTypesForGeneration,
        processedSalesRevenueMap,
        processedExpensesMap
      );
      setFullHistoricalData(financialData);
      setIsLoadingOverall(false);
    };
    fetchAllApicultureData();
  }, [
    parsedUserId,
    processSalesDataForRevenue,
    processExpensesDataForApiculture,
  ]);

  const apicultureCardData = useMemo(() => {
    if (fullHistoricalData.length === 0 && !isLoadingOverall) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: `${TARGET_APICULTURE_SUB_TYPE} ${metric}`,
        value: 0,
        icon: faDollarSign,
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    let apicultureRevenue = 0,
      apicultureCogs = 0,
      apicultureExpenses = 0;

    fullHistoricalData.forEach((entry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        apicultureRevenue +=
          entry.revenue.breakdown.find(
            (b) => b.name === TARGET_APICULTURE_SUB_TYPE
          )?.value || 0;
        apicultureCogs +=
          entry.cogs.breakdown.find(
            (b) => b.name === TARGET_APICULTURE_SUB_TYPE
          )?.value || 0;
        apicultureExpenses +=
          entry.expenses.breakdown.find(
            (b) => b.name === TARGET_APICULTURE_SUB_TYPE
          )?.value || 0;
      }
    });
    const apicultureGrossProfit = apicultureRevenue - apicultureCogs;
    const apicultureNetProfit = apicultureGrossProfit - apicultureExpenses;

    return [
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Revenue`,
        value: apicultureRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-800",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} COGS`,
        value: apicultureCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-500",
        iconValueColor: "text-yellow-200 dark:text-yellow-100",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Gross Profit`,
        value: apicultureGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-600",
        iconValueColor: "text-cyan-200 dark:text-cyan-100",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Expenses`,
        value: apicultureExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-600",
        iconValueColor: "text-red-200 dark:text-red-100",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Net Profit`,
        value: apicultureNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-600",
        iconValueColor: "text-blue-200 dark:text-blue-100",
      },
    ];
  }, [fullHistoricalData, currentDate, isLoadingOverall]);

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Apiculture</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Apiculture
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center cursor-pointer text-sm text-blue-200 hover:text-blue-100 dark:hover:text-blue-300"
              onClick={() => setShowFinancials(!showFinancials)}
            >
              <FontAwesomeIcon
                icon={showFinancials ? faChevronUp : faChevronDown}
                className="mr-2 h-3 w-3"
              />
              {showFinancials ? "Hide Finances" : "Show Finances"}
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showFinancials
              ? "max-h-[500px] opacity-100 mb-6"
              : "max-h-0 opacity-0"
          }`}
        >
          {isLoadingOverall ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-2">
              {apicultureCardData.map((card, index) => (
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
        </div>
      </div>
    </PlatformLayout>
  );
};

export default Apiculture;
