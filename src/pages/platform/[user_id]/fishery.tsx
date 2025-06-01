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
import { FISHERY_EXPENSE_CONFIG, PAGINATION_ITEMS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import FisheryForm from "@/components/form/FisheryForm";
import Table from "@/components/tables/Table";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import TaskManager from "@/components/cards/TaskManager";
import InventoryStockCard from "@/components/cards/InventoryStock";

import { useSubTypeFinancialData, DailyFinancialEntry } from "@/hooks/finance";

type View = "fishery";

type FisheryApiData = {
  fishery_id: number;
  user_id?: number;
  fishery_type: string;
  target_species: string;
  feed_type: string;
  notes?: string;
  created_at?: string;
};

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;

const TARGET_FISHERY_SUB_TYPE = "Fishery";

const Fishery = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const numericUserId = parsedUserId ? parseInt(parsedUserId, 10) : undefined;
  const view: View = "fishery";

  const [fisheryRecords, setFisheryRecords] = useState<FisheryApiData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFisheries, setLoadingFisheries] = useState(true);
  const [editingFishery, setEditingFishery] = useState<FisheryApiData | null>(
    null
  );

  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = useMemo(() => new Date(), []);

  const { fullHistoricalData, isLoadingFinancials } = useSubTypeFinancialData({
    userId: parsedUserId,
    targetSubType: TARGET_FISHERY_SUB_TYPE,
    expenseCategoryConfig: FISHERY_EXPENSE_CONFIG,
  });

  const fetchFisheries = useCallback(async () => {
    if (!parsedUserId) {
      setLoadingFisheries(false);
      return;
    }
    setLoadingFisheries(true);
    try {
      const response = await axiosInstance.get(
        `/fishery/user/${encodeURIComponent(parsedUserId)}`
      );
      setFisheryRecords(response.data.fisheries || []);
    } catch (error: unknown) {
      console.error(
        error instanceof Error
          ? `Error fetching fishery data: ${error.message}`
          : "Unknown error fetching fishery data"
      );
      setFisheryRecords([]);
    } finally {
      setLoadingFisheries(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (router.isReady) {
      fetchFisheries();
    }
  }, [router.isReady, fetchFisheries]);

  const fisheryCardData = useMemo(() => {
    if (fullHistoricalData.length === 0 && !isLoadingFinancials) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: `${TARGET_FISHERY_SUB_TYPE} ${metric}`,
        value: 0,
        icon: faDollarSign,
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    let fisheryRevenue = 0;
    let fisheryCogs = 0;
    let fisheryExpenses = 0;

    fullHistoricalData.forEach((entry: DailyFinancialEntry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        fisheryRevenue +=
          entry.revenue.breakdown.find(
            (b) => b.name === TARGET_FISHERY_SUB_TYPE
          )?.value || 0;
        fisheryCogs +=
          entry.cogs.breakdown.find((b) => b.name === TARGET_FISHERY_SUB_TYPE)
            ?.value || 0;
        fisheryExpenses +=
          entry.expenses.breakdown.find(
            (b) => b.name === TARGET_FISHERY_SUB_TYPE
          )?.value || 0;
      }
    });
    const fisheryGrossProfit = fisheryRevenue - fisheryCogs;
    const fisheryNetProfit = fisheryGrossProfit - fisheryExpenses;

    return [
      {
        title: `${TARGET_FISHERY_SUB_TYPE} Revenue`,
        value: fisheryRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-800",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: `${TARGET_FISHERY_SUB_TYPE} COGS`,
        value: fisheryCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-100",
        iconValueColor: "text-yellow-200",
      },
      {
        title: `${TARGET_FISHERY_SUB_TYPE} Gross Profit`,
        value: fisheryGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-100",
        iconValueColor: "text-cyan-200",
      },
      {
        title: `${TARGET_FISHERY_SUB_TYPE} Expenses`,
        value: fisheryExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-100",
        iconValueColor: "text-red-200",
      },
      {
        title: `${TARGET_FISHERY_SUB_TYPE} Net Profit`,
        value: fisheryNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-100",
        iconValueColor: "text-blue-200 dark:text-blue-200",
      },
    ];
  }, [fullHistoricalData, currentDate, isLoadingFinancials]);

  const filteredFisheryRecords = useMemo(() => {
    if (!searchQuery) return fisheryRecords;
    return fisheryRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        item.fishery_type.toLowerCase().includes(searchTerm) ||
        item.target_species.toLowerCase().includes(searchTerm) ||
        item.feed_type.toLowerCase().includes(searchTerm) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm))
      );
    });
  }, [fisheryRecords, searchQuery]);

  const handleFisheryFormSuccess = () => {
    setIsSidebarOpen(false);
    setEditingFishery(null);
    fetchFisheries();
  };

  const tableData = useMemo(
    () => ({
      columns: ["#", "Fishery Type", "Target Species", "Feed Type", "Notes"],
      rows: filteredFisheryRecords.map((item) => [
        item.fishery_id,
        item.fishery_type,
        item.target_species,
        item.feed_type,
        item.notes || "N/A",
      ]),
    }),
    [filteredFisheryRecords]
  );

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Fishery</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Fishery Management
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loadingFisheries
                ? "Loading records..."
                : `${filteredFisheryRecords.length} Record(s) found ${
                    searchQuery ? "(filtered)" : ""
                  }`}
            </p>
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
            <Button
              text="Add Fishery Data"
              style="primary"
              add
              onClick={() => {
                setEditingFishery(null);
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
              {fisheryCardData.map((card, index) => (
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

        {numericUserId && !isNaN(numericUserId) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TaskManager userId={numericUserId} projectType="Fishery" />
            <InventoryStockCard
              userId={parsedUserId}
              title="Fishery Related Inventory"
              category="Fishery"
            />
          </div>
        )}


        {loadingFisheries && !fisheryRecords.length ? (
          <div className="flex justify-center items-center py-10 mt-6">
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
            totalRecordCount={filteredFisheryRecords.length}
            onRowClick={(row) => {
              const fisheryId = row[0] as number;
              const targetSpecies = row[2] as string;
              if (parsedUserId && fisheryId) {
                router.push({
                  pathname: `/platform/${parsedUserId}/fishery/${fisheryId}`,
                  query: { targetSpecies: encodeURIComponent(targetSpecies) },
                });
              }
            }}
            view={view}
            loading={loadingFisheries && fisheryRecords.length > 0}
            reset={true}
            hideChecks={false}
            download={true}
          />
        )}

        {isSidebarOpen && (
          <FisheryForm
            onClose={() => {
              setIsSidebarOpen(false);
              setEditingFishery(null);
            }}
            formTitle={
              editingFishery ? "Edit Fishery Data" : "Add New Fishery Data"
            }
            onFisheryUpdateOrAdd={handleFisheryFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default Fishery;
