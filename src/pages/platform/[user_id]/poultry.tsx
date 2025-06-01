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
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import Button from "@/components/ui/Button";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS, POULTRY_EXPENSE_CONFIG } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import FlockForm from "@/components/form/FlockForm";
import Table from "@/components/tables/Table";
import BudgetCard from "@/components/cards/finance/BudgetCard";

import { useSubTypeFinancialData, DailyFinancialEntry } from "@/hooks/finance";

type View = "flock";

type FlockApiData = {
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

const TARGET_POULTRY_SUB_TYPE = "Poultry";

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

  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = useMemo(() => new Date(), []);

  const { fullHistoricalData, isLoadingFinancials } = useSubTypeFinancialData({
    userId: parsedUserId,
    targetSubType: TARGET_POULTRY_SUB_TYPE,
    expenseCategoryConfig: POULTRY_EXPENSE_CONFIG,
  });

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

    fullHistoricalData.forEach((entry: DailyFinancialEntry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        poultryRevenue +=
          entry.revenue.breakdown.find(
            (b) => b.name === TARGET_POULTRY_SUB_TYPE
          )?.value || 0;
        poultryCogs +=
          entry.cogs.breakdown.find((b) => b.name === TARGET_POULTRY_SUB_TYPE)
            ?.value || 0;
        poultryExpenses +=
          entry.expenses.breakdown.find(
            (b) => b.name === TARGET_POULTRY_SUB_TYPE
          )?.value || 0;
      }
    });
    const poultryGrossProfit = poultryRevenue - poultryCogs;
    const poultryNetProfit = poultryGrossProfit - poultryExpenses;

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
        bgColor: "bg-yellow-300 dark:bg-yellow-100",
        iconValueColor: "text-yellow-200",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Gross Profit`,
        value: poultryGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-600",
        iconValueColor: "text-cyan-200",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Expenses`,
        value: poultryExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-100",
        iconValueColor: "text-red-200",
      },
      {
        title: `${TARGET_POULTRY_SUB_TYPE} Net Profit`,
        value: poultryNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-100",
        iconValueColor: "text-blue-200 dark:text-blue-200",
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
          <p className="text-red-200">User ID not found. Cannot load page.</p>
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
            formTitle={editingFlock ? "Edit Flock" : "Add Flock"}
            onFlockUpdateOrAdd={handleFlockFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default Poultry;
