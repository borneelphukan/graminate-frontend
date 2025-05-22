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
} from "date-fns";

import Button from "@/components/ui/Button";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import FlockForm from "@/components/form/FlockForm";
import Table from "@/components/tables/Table";
import BudgetCard from "@/components/cards/finance/BudgetCard";

type View = "flock";

interface FlockApiData {
  flock_id: number;
  user_id?: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
}

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

const TARGET_POULTRY_SUB_TYPE = "Poultry";

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

const Poultry = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const view: View = "flock";

  const [flockRecords, setFlockRecords] = useState<FlockApiData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFlocks, setLoadingFlocks] = useState(true);
  const [editingFlock, setEditingFlock] = useState<FlockApiData | null>(null);

  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(true);
  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = new Date();

  const fetchFlocks = useCallback(async () => {
    if (!parsedUserId) {
      setLoadingFlocks(false);
      return;
    }
    setLoadingFlocks(true);
    try {
      const response = await axiosInstance.get(
        `/flock/user/${encodeURIComponent(parsedUserId)}`
      );
      setFlockRecords(response.data.flocks || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching flock data:", error.message);
      } else {
        console.error("Unknown error fetching flock data");
      }
      setFlockRecords([]);
    } finally {
      setLoadingFlocks(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (router.isReady) {
      fetchFlocks();
    }
  }, [router.isReady, fetchFlocks]);

  useEffect(() => {
    if (!parsedUserId) {
      setIsLoadingFinancials(false);
      return;
    }

    setIsLoadingFinancials(true);
    const fetchUserDetailsAndGenerateFinancialData = async () => {
      let fetchedSubTypes: string[] = [];
      try {
        const response = await axiosInstance.get(`/user/${parsedUserId}`);
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
        console.error(
          "FlocksPage: Error fetching user details for financials:",
          error
        );
      }

      const data = generateDailyFinancialData(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        fetchedSubTypes
      );
      setFullHistoricalData(data);
      setIsLoadingFinancials(false);
    };

    fetchUserDetailsAndGenerateFinancialData();
  }, [parsedUserId]);

  const poultryCardData = useMemo(() => {
    const defaultCardValues = {
      Revenue: 0,
      COGS: 0,
      Expenses: 0,
      "Gross Profit": 0,
      "Net Profit": 0,
    };

    if (fullHistoricalData.length === 0) {
      return [
        {
          title: "Revenue",
          value: defaultCardValues.Revenue,
          icon: faDollarSign,
          bgColor: "bg-green-300 dark:bg-green-800",
          iconValueColor: "text-green-200 dark:text-green-200",
        },
        {
          title: "COGS",
          value: defaultCardValues.COGS,
          icon: faShoppingCart,
          bgColor: "bg-yellow-300 dark:bg-yellow-500",
          iconValueColor: "text-yellow-200 dark:text-yellow-100",
        },
        {
          title: "Gross Profit",
          value: defaultCardValues["Gross Profit"],
          icon: faChartPie,
          bgColor: "bg-cyan-300 dark:bg-cyan-600",
          iconValueColor: "text-cyan-200 dark:text-cyan-100",
        },
        {
          title: "Expenses",
          value: defaultCardValues.Expenses,
          icon: faCreditCard,
          bgColor: "bg-red-300 dark:bg-red-600",
          iconValueColor: "text-red-200 dark:text-red-100",
        },
        {
          title: "Net Profit",
          value: defaultCardValues["Net Profit"],
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

    let poultryRevenue = 0;
    let poultryCogs = 0;
    let poultryExpenses = 0;

    currentMonthEntries.forEach((entry) => {
      const revenueBreakdown = entry.revenue.breakdown.find(
        (b) => b.name === TARGET_POULTRY_SUB_TYPE
      );
      if (revenueBreakdown) poultryRevenue += revenueBreakdown.value;

      const cogsBreakdown = entry.cogs.breakdown.find(
        (b) => b.name === TARGET_POULTRY_SUB_TYPE
      );
      if (cogsBreakdown) poultryCogs += cogsBreakdown.value;

      const expensesBreakdown = entry.expenses.breakdown.find(
        (b) => b.name === TARGET_POULTRY_SUB_TYPE
      );
      if (expensesBreakdown) poultryExpenses += expensesBreakdown.value;
    });

    const poultryGrossProfit = poultryRevenue - poultryCogs;
    const poultryNetProfit = poultryGrossProfit - poultryExpenses;

    return [
      {
        title: `Poultry Revenue`,
        value: poultryRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-100",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: `Poultry COGS`,
        value: poultryCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-200",
        iconValueColor: "text-yellow-200 dark:text-yellow-100",
      },
      {
        title: `Poultry Gross Profit`,
        value: poultryGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-200",
        iconValueColor: "text-cyan-200 dark:text-cyan-100",
      },
      {
        title: `Poultry Expenses`,
        value: poultryExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-200",
        iconValueColor: "text-red-200 dark:text-red-100",
      },
      {
        title: `Poultry Net Profit`,
        value: poultryNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-200",
        iconValueColor: "text-blue-200 dark:text-blue-100",
      },
    ];
  }, [fullHistoricalData, currentDate]);

  const filteredFlockRecords = useMemo(() => {
    if (!searchQuery) {
      return flockRecords;
    }
    return flockRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        item.flock_name.toLowerCase().includes(searchTerm) ||
        item.flock_type.toLowerCase().includes(searchTerm) ||
        String(item.quantity).toLowerCase().includes(searchTerm) ||
        (item.breed && item.breed.toLowerCase().includes(searchTerm)) ||
        (item.source && item.source.toLowerCase().includes(searchTerm)) ||
        (item.housing_type &&
          item.housing_type.toLowerCase().includes(searchTerm))
      );
    });
  }, [flockRecords, searchQuery]);

  const handleFlockFormSuccess = () => {
    setIsSidebarOpen(false);
    setEditingFlock(null);
    fetchFlocks();
  };

  const tableData = useMemo(() => {
    return {
      columns: ["#", "Flock Name", "Type", "Qty", "Breed", "Source", "Housing"],
      rows: filteredFlockRecords.map((item) => [
        item.flock_id,
        item.flock_name,
        item.flock_type,
        item.quantity,
        item.breed || "N/A",
        item.source || "N/A",
        item.housing_type || "N/A",
      ]),
    };
  }, [filteredFlockRecords]);

  if (!parsedUserId && !loadingFlocks && !isLoadingFinancials) {
    return (
      <PlatformLayout>
        <Head>
          <title>Graminate | Flocks</title>
        </Head>
        <div className="container mx-auto p-4 text-center">
          <p className="text-red-500">User ID not found. Cannot load page.</p>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Flocks</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Poultry Farm Flocks
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loadingFlocks
                ? "Loading records..."
                : `${filteredFlockRecords.length} Record(s) found ${
                    searchQuery ? "(filtered)" : ""
                  }`}
            </p>
          </div>
          <div className="flex flex-row gap-6">
            <div className="flex justify-end items-center">
              <div
                className="flex items-center cursor-pointer text-sm text-blue-200 dark:hover:text-blue-300"
                onClick={() => setShowFinancials(!showFinancials)}
              >
                <FontAwesomeIcon
                  icon={showFinancials ? faChevronUp : faChevronDown}
                  className="mr-2 h-3 w-3"
                />
                {showFinancials ? "Hide Finances" : "Show Finances"}
              </div>
            </div>
            <Button
              text="Add Flock"
              style="primary"
              add
              onClick={() => {
                setEditingFlock(null);
                setIsSidebarOpen(true);
              }}
            />
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showFinancials ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {isLoadingFinancials ? (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-2">
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
            <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-2">
              {poultryCardData.map((card, index) => (
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

        {loadingFlocks && !flockRecords.length ? (
          <div className="flex justify-center items-center py-10">
            <Loader />
          </div>
        ) : (
          <Table
            data={tableData}
            filteredRows={tableData.rows}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            paginationItems={PAGINATION_ITEMS}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecordCount={filteredFlockRecords.length}
            onRowClick={(row) => {
              const flockId = row[0] as number;
              const flockName = row[1] as string;
              if (parsedUserId && flockId) {
                router.push({
                  pathname: `/platform/${parsedUserId}/poultry/${flockId}`,
                  query: {
                    flockName: encodeURIComponent(flockName),
                  },
                });
              }
            }}
            view={view}
            loading={loadingFlocks && flockRecords.length > 0}
            reset={true}
            hideChecks={false}
            download={true}
          />
        )}

        {isSidebarOpen && (
          <FlockForm
            onClose={() => {
              setIsSidebarOpen(false);
              setEditingFlock(null);
            }}
            formTitle={editingFlock ? "Edit Flock" : "Add New Flock"}
            onFlockUpdateOrAdd={handleFlockFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default Poultry;
