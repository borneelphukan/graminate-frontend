import { useState, useMemo, useEffect, useCallback } from "react";
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
import TaskManager from "@/components/cards/TaskManager";
import InventoryStockCard from "@/components/cards/InventoryStock";
import Button from "@/components/ui/Button";
import Table from "@/components/tables/Table";
import { PAGINATION_ITEMS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";

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
import ApicultureForm from "@/components/form/apiculture/ApicultureForm";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type View = "apiculture";

type ApicultureRecord = {
  apiary_id: number;
  user_id: number;
  apiary_name: string;
  number_of_hives: number;
  area: number | null;
  created_at: string;
};

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
  const numericUserId = parsedUserId ? parseInt(parsedUserId, 10) : undefined;
  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = useMemo(() => new Date(), []);
  const view: View = "apiculture";

  const [apicultureRecords, setApicultureRecords] = useState<
    ApicultureRecord[]
  >([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingApiculture, setLoadingApiculture] = useState(true);
  const [editingApiary, setEditingApiary] = useState<ApicultureRecord | null>(
    null
  );

  const { fullHistoricalData, isLoadingFinancials } = useSubTypeFinancialData({
    userId: parsedUserId,
    targetSubType: TARGET_APICULTURE_SUB_TYPE,
    expenseCategoryConfig: APICULTURE_EXPENSE_CONFIG,
  });

  const fetchApiculture = useCallback(async () => {
    if (!parsedUserId) {
      setLoadingApiculture(false);
      return;
    }
    setLoadingApiculture(true);
    try {
      const response = await axiosInstance.get(
        `/apiculture/user/${encodeURIComponent(parsedUserId)}`
      );
      setApicultureRecords(response.data.apiaries || []);
    } catch (error: unknown) {
      console.error(
        error instanceof Error
          ? `Error fetching apiculture data: ${error.message}`
          : "Unknown error fetching apiculture data"
      );
      setApicultureRecords([]);
    } finally {
      setLoadingApiculture(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (router.isReady) {
      fetchApiculture();
    }
  }, [router.isReady, fetchApiculture]);

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

  const filteredApicultureRecords = useMemo(() => {
    if (!searchQuery) return apicultureRecords;
    return apicultureRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      return item.apiary_name.toLowerCase().includes(searchTerm);
    });
  }, [apicultureRecords, searchQuery]);

  const handleApiaryFormSuccess = () => {
    setIsSidebarOpen(false);
    setEditingApiary(null);
    fetchApiculture();
  };

  const tableData = useMemo(
    () => ({
      columns: [
        "#",
        "Bee Yard Name",
        "Area (sq. m)",
        "No. of Hives",
        "Created At",
      ],
      rows: filteredApicultureRecords.map((item) => [
        item.apiary_id,
        item.apiary_name,
        item.area != null ? `${item.area}` : "N/A",
        item.number_of_hives,
        new Date(item.created_at).toLocaleDateString(),
      ]),
    }),
    [filteredApicultureRecords]
  );

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Apiculture</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Apiculture Records
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loadingApiculture
                ? "Loading records..."
                : `${filteredApicultureRecords.length} Record(s) found ${
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
              add
              text=" Bee Yard"
              style="primary"
              onClick={() => {
                setEditingApiary(null);
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

        {numericUserId && !isNaN(numericUserId) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TaskManager userId={numericUserId} projectType="Apiculture" />
            <InventoryStockCard
              userId={parsedUserId}
              title="Apiculture Inventory"
              category="Apiculture"
            />
          </div>
        )}

        {loadingApiculture && !apicultureRecords.length ? (
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
            totalRecordCount={filteredApicultureRecords.length}
            onRowClick={(row) => {
              const apiaryId = row[0] as number;
              const apiaryName = row[1] as string;
              if (parsedUserId && apiaryId) {
                router.push({
                  pathname: `/platform/${parsedUserId}/apiculture/${apiaryId}`,
                  query: { apiaryName: encodeURIComponent(apiaryName) },
                });
              }
            }}
            view={view}
            loading={loadingApiculture && apicultureRecords.length > 0}
            reset={true}
            hideChecks={false}
            download={true}
          />
        )}

        {isSidebarOpen && (
          <ApicultureForm
            onClose={() => {
              setIsSidebarOpen(false);
              setEditingApiary(null);
            }}
            formTitle={editingApiary ? "Edit Bee Yard" : "Add New Bee Yard"}
            apiaryToEdit={editingApiary}
            onApiaryUpdateOrAdd={handleApiaryFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default Apiculture;
