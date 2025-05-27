import { useState, useMemo } from "react";
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
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import PlatformLayout from "@/layout/PlatformLayout";
import Loader from "@/components/ui/Loader";
import BudgetCard from "@/components/cards/finance/BudgetCard";

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

import {
  useSubTypeFinancialData,
  DailyFinancialEntry,
  ExpenseCategoryConfig,
} from "@/hooks/finance";

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

const TARGET_APICULTURE_SUB_TYPE = "Apiculture";

const APICULTURE_EXPENSE_CONFIG: ExpenseCategoryConfig = {
  detailedCategories: {
    "Goods & Services": [
      "Beehives",
      "Queen Bees",
      "Sugar Feed",
      "Pollen Patties",
      "Medication",
    ],
    "Utility Expenses": [
      "Equipment (Smoker, Hive Tool)",
      "Protective Gear",
      "Transportation",
      "Licenses & Permits",
      "Others",
    ],
  },
  expenseTypeMap: {
    COGS: "Goods & Services",
    OPERATING_EXPENSES: "Utility Expenses",
  },
};

const Apiculture = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = useMemo(() => new Date(), []);

  const { fullHistoricalData, isLoadingFinancials } = useSubTypeFinancialData({
    userId: parsedUserId,
    targetSubType: TARGET_APICULTURE_SUB_TYPE,
    expenseCategoryConfig: APICULTURE_EXPENSE_CONFIG,
  });

  const apicultureCardData = useMemo(() => {
    if (fullHistoricalData.length === 0 && !isLoadingFinancials) {
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

    fullHistoricalData.forEach((entry: DailyFinancialEntry) => {
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
        bgColor: "bg-yellow-300 dark:bg-yellow-100",
        iconValueColor: "text-yellow-200",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Gross Profit`,
        value: apicultureGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-100",
        iconValueColor: "text-cyan-200",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Expenses`,
        value: apicultureExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-100",
        iconValueColor: "text-red-200",
      },
      {
        title: `${TARGET_APICULTURE_SUB_TYPE} Net Profit`,
        value: apicultureNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-100",
        iconValueColor: "text-blue-200",
      },
    ];
  }, [fullHistoricalData, currentDate, isLoadingFinancials]);

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
          {isLoadingFinancials ? (
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

        {isLoadingFinancials && (
          <div className="flex justify-center items-center py-10">
            <Loader />
          </div>
        )}
        {!isLoadingFinancials && fullHistoricalData.length === 0 && (
          <div className="text-center py-10 dark:text-gray-400">
            No financial data available for Apiculture yet.
          </div>
        )}
      </div>
    </PlatformLayout>
  );
};

export default Apiculture;
