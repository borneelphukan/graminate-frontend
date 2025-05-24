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
} from "date-fns";

import Button from "@/components/ui/Button";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import FlockForm from "@/components/form/FlockForm";
import Table from "@/components/tables/Table";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import Swal from "sweetalert2";

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

type SaleRecordForRevenue = {
  sales_id: number;
  sales_date: string;
  occupation?: string;
  items_sold: string[];
  quantities_sold: number[];
  prices_per_unit?: number[];
};

const TARGET_POULTRY_SUB_TYPE = "Poultry";

const generateDailyFinancialDataWithActualRevenue = (
  count: number,
  userSubTypes: string[],
  actualSalesRevenueMap?: Map<string, MetricBreakdown>
): DailyFinancialEntry[] => {
  const data: DailyFinancialEntry[] = [];
  let loopDate = subDaysDateFns(today, count - 1);
  const allPossibleBreakdownNames = [
    ...new Set([...userSubTypes, TARGET_POULTRY_SUB_TYPE, "Uncategorized"]),
  ];

  for (let i = 0; i < count; i++) {
    const dateKey = formatDateFns(loopDate, "yyyy-MM-dd");
    const actualRevenueForDay = actualSalesRevenueMap?.get(dateKey);
    const dailyEntry: Partial<DailyFinancialEntry> = {
      date: new Date(loopDate),
    };
    let baseRevenue: number;
    let revenueBreakdown: SubTypeValue[];

    if (actualRevenueForDay) {
      baseRevenue = actualRevenueForDay.total;
      revenueBreakdown = allPossibleBreakdownNames.map((name) => {
        const found = actualRevenueForDay.breakdown.find(
          (b) => b.name === name
        );
        return { name, value: found ? found.value : 0 };
      });
    } else {
      baseRevenue = 0;
      revenueBreakdown = allPossibleBreakdownNames.map((name) => ({
        name,
        value: 0,
      }));
    }
    dailyEntry.revenue = { total: baseRevenue, breakdown: revenueBreakdown };

    const zeroBreakdown = allPossibleBreakdownNames.map((name) => ({
      name,
      value: 0,
    }));
    dailyEntry.cogs = { total: 0, breakdown: [...zeroBreakdown] }; // Yet to be set from actual data
    dailyEntry.grossProfit = {
      total: baseRevenue - 0,
      breakdown: [...revenueBreakdown],
    }; // Based on actual revenue and 0 COGS (Yet to be set)
    dailyEntry.expenses = { total: 0, breakdown: [...zeroBreakdown] }; // Yet to be set from actual data
    dailyEntry.netProfit = {
      total: baseRevenue - 0 - 0,
      breakdown: [...revenueBreakdown],
    }; // Based on actual revenue, 0 COGS, 0 Expenses (Yet to be set)

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
  const [userSubTypes, setUserSubTypes] = useState<string[]>([]);

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
      console.error(
        error instanceof Error
          ? `Error fetching flock data: ${error.message}`
          : "Unknown error fetching flock data"
      );
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

  const processSalesDataForRevenue = useCallback(
    (
      sales: SaleRecordForRevenue[],
      allUserSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();
      const subTypesIncludingTargetAndUncategorized = [
        ...new Set([
          ...allUserSubTypes,
          TARGET_POULTRY_SUB_TYPE,
          "Uncategorized",
        ]),
      ];

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

  useEffect(() => {
    if (!parsedUserId) {
      setIsLoadingFinancials(false);
      return;
    }
    setIsLoadingFinancials(true);
    const fetchFinancialRelatedData = async () => {
      let fetchedUserSubTypesInternal: string[] = [];
      let processedSalesRevenueMap: Map<string, MetricBreakdown> = new Map();
      try {
        const userResponse = await axiosInstance.get(`/user/${parsedUserId}`);
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

        const salesResponse = await axiosInstance.get<{
          sales: SaleRecordForRevenue[];
        }>(`/sales/user/${parsedUserId}`);
        const salesRecords = salesResponse.data.sales || [];
        processedSalesRevenueMap = processSalesDataForRevenue(
          salesRecords,
          fetchedUserSubTypesInternal
        );
      } catch (error) {
        console.error(
          "PoultryPage: Error fetching financial related data:",
          error
        );
        Swal.fire(
          "Error",
          "Could not load financial data for Poultry.",
          "error"
        );
      }
      const subTypesForGeneration = [
        ...new Set([...fetchedUserSubTypesInternal, TARGET_POULTRY_SUB_TYPE]),
      ];
      const data = generateDailyFinancialDataWithActualRevenue(
        TOTAL_DAYS_FOR_HISTORICAL_DATA,
        subTypesForGeneration,
        processedSalesRevenueMap
      );
      setFullHistoricalData(data);
      setIsLoadingFinancials(false);
    };
    fetchFinancialRelatedData();
  }, [parsedUserId, processSalesDataForRevenue]);

  const poultryCardData = useMemo(() => {
    if (fullHistoricalData.length === 0 && !isLoadingFinancials) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: `${TARGET_POULTRY_SUB_TYPE} ${metric}`,
        value: 0,
        icon: faDollarSign,
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    let poultryRevenue = 0,
      poultryCogs = 0,
      poultryExpenses = 0;

    fullHistoricalData.forEach((entry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        const revenuePoultry =
          entry.revenue.breakdown.find(
            (b) => b.name === TARGET_POULTRY_SUB_TYPE
          )?.value || 0;
        poultryRevenue += revenuePoultry;
        // poultryCogs += entry.cogs.breakdown.find(b => b.name === TARGET_POULTRY_SUB_TYPE)?.value || 0; // Yet to be set from actual data
        // poultryExpenses += entry.expenses.breakdown.find(b => b.name === TARGET_POULTRY_SUB_TYPE)?.value || 0; // Yet to be set from actual data
      }
    });
    const poultryGrossProfit = poultryRevenue - poultryCogs; // poultryCogs is 0, so Gross Profit = Revenue
    const poultryNetProfit = poultryGrossProfit - poultryExpenses; // poultryExpenses is 0, so Net Profit = Gross Profit

    return [
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Revenue`,
        value: poultryRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-800",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} COGS`,
        value: poultryCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-500",
        iconValueColor: "text-yellow-200 dark:text-yellow-100",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Gross Profit`,
        value: poultryGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-600",
        iconValueColor: "text-cyan-200 dark:text-cyan-100",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Expenses`,
        value: poultryExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-600",
        iconValueColor: "text-red-200 dark:text-red-100",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Net Profit`,
        value: poultryNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-600",
        iconValueColor: "text-blue-200 dark:text-blue-100",
      },
    ];
  }, [fullHistoricalData, currentDate, isLoadingFinancials]);

  const filteredFlockRecords = useMemo(() => {
    if (!searchQuery) return flockRecords;
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

  const tableData = useMemo(
    () => ({
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
    }),
    [filteredFlockRecords]
  );

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
            showFinancials
              ? "max-h-[500px] opacity-100 mb-6"
              : "max-h-0 opacity-0"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-2">
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
                  query: { flockName: encodeURIComponent(flockName) },
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
