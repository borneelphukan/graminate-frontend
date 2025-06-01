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
  faPlus,
  faListOl,
  faBullseye,
  faPaw,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import Button from "@/components/ui/Button";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS, POULTRY_EXPENSE_CONFIG } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import Table from "@/components/tables/Table";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import { useSubTypeFinancialData, DailyFinancialEntry } from "@/hooks/finance";
import CattleForm, { CattleRearingData } from "@/components/form/CattleForm";

type View = "cattle";

type CattleRearingRecord = {
  cattle_id: number;
  user_id: number;
  cattle_name: string;
  cattle_type: string | null;
  number_of_animals: number;
  purpose: string | null;
  created_at: string;
}

const FINANCIAL_METRICS = [
  "Revenue",
  "COGS",
  "Gross Profit",
  "Expenses",
  "Net Profit",
] as const;

const TARGET_CATTLE_SUB_TYPE = "Cattle Rearing";

const CattleRearingPage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const view: View = "cattle";

  const [cattleRecords, setCattleRecords] = useState<CattleRearingRecord[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCattle, setLoadingCattle] = useState(true);
  const [editingCattle, setEditingCattle] =
    useState<CattleRearingRecord | null>(null);

  const [showFinancials, setShowFinancials] = useState(true);
  const currentDate = useMemo(() => new Date(), []);

  const { fullHistoricalData, isLoadingFinancials } = useSubTypeFinancialData({
    userId: parsedUserId,
    targetSubType: TARGET_CATTLE_SUB_TYPE,
    expenseCategoryConfig: POULTRY_EXPENSE_CONFIG,
  });

  const fetchCattle = useCallback(async () => {
    if (!parsedUserId) {
      setLoadingCattle(false);
      return;
    }
    setLoadingCattle(true);
    try {
      const response = await axiosInstance.get(
        `/cattle-rearing/user/${encodeURIComponent(parsedUserId)}`
      );
      setCattleRecords(response.data.cattleRearings || []);
    } catch (error: unknown) {
      console.error(
        error instanceof Error
          ? `Error fetching cattle data: ${error.message}`
          : "Unknown error fetching cattle data"
      );
      setCattleRecords([]);
    } finally {
      setLoadingCattle(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (router.isReady) {
      fetchCattle();
    }
  }, [router.isReady, fetchCattle]);

  const cattleCardData = useMemo(() => {
    if (fullHistoricalData.length === 0 && !isLoadingFinancials) {
      return FINANCIAL_METRICS.map((metric) => ({
        title: `${TARGET_CATTLE_SUB_TYPE} ${metric}`,
        value: 0,
        icon: faDollarSign,
        bgColor: "bg-gray-300 dark:bg-gray-700",
        iconValueColor: "text-gray-500 dark:text-gray-400",
      }));
    }
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    let cattleRevenue = 0,
      cattleCogs = 0,
      cattleExpenses = 0;

    fullHistoricalData.forEach((entry: DailyFinancialEntry) => {
      if (
        isWithinInterval(entry.date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        cattleRevenue +=
          entry.revenue.breakdown.find((b) => b.name === TARGET_CATTLE_SUB_TYPE)
            ?.value || 0;
        cattleCogs +=
          entry.cogs.breakdown.find((b) => b.name === TARGET_CATTLE_SUB_TYPE)
            ?.value || 0;
        cattleExpenses +=
          entry.expenses.breakdown.find(
            (b) => b.name === TARGET_CATTLE_SUB_TYPE
          )?.value || 0;
      }
    });
    const cattleGrossProfit = cattleRevenue - cattleCogs;
    const cattleNetProfit = cattleGrossProfit - cattleExpenses;

    return [
      {
        title: `${TARGET_CATTLE_SUB_TYPE} Revenue`,
        value: cattleRevenue,
        icon: faDollarSign,
        bgColor: "bg-green-300 dark:bg-green-800",
        iconValueColor: "text-green-200 dark:text-green-200",
      },
      {
        title: `${TARGET_CATTLE_SUB_TYPE} COGS`,
        value: cattleCogs,
        icon: faShoppingCart,
        bgColor: "bg-yellow-300 dark:bg-yellow-100",
        iconValueColor: "text-yellow-200",
      },
      {
        title: `${TARGET_CATTLE_SUB_TYPE} Gross Profit`,
        value: cattleGrossProfit,
        icon: faChartPie,
        bgColor: "bg-cyan-300 dark:bg-cyan-600",
        iconValueColor: "text-cyan-200",
      },
      {
        title: `${TARGET_CATTLE_SUB_TYPE} Expenses`,
        value: cattleExpenses,
        icon: faCreditCard,
        bgColor: "bg-red-300 dark:bg-red-100",
        iconValueColor: "text-red-200",
      },
      {
        title: `${TARGET_CATTLE_SUB_TYPE} Net Profit`,
        value: cattleNetProfit,
        icon: faPiggyBank,
        bgColor: "bg-blue-300 dark:bg-blue-100",
        iconValueColor: "text-blue-200 dark:text-blue-200",
      },
    ];
  }, [fullHistoricalData, currentDate, isLoadingFinancials]);

  const filteredCattleRecords = useMemo(() => {
    if (!searchQuery) return cattleRecords;
    return cattleRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        item.cattle_name.toLowerCase().includes(searchTerm) ||
        (item.cattle_type &&
          item.cattle_type.toLowerCase().includes(searchTerm)) ||
        (item.purpose && item.purpose.toLowerCase().includes(searchTerm))
      );
    });
  }, [cattleRecords, searchQuery]);

  const handleCattleFormSuccess = (updatedOrAddedCattle: CattleRearingData) => {
    setIsSidebarOpen(false);
    setEditingCattle(null);
    fetchCattle();
  };

  const tableData = useMemo(
    () => ({
      columns: ["#", "Name", "Type", "No. of Animals", "Purpose", "Created At"],
      rows: filteredCattleRecords.map((item) => [
        item.cattle_id,
        item.cattle_name,
        item.cattle_type || "N/A",
        item.number_of_animals,
        item.purpose || "N/A",
        new Date(item.created_at).toLocaleDateString(),
      ]),
    }),
    [filteredCattleRecords]
  );

  if (!parsedUserId && !loadingCattle && !isLoadingFinancials) {
    return (
      <PlatformLayout>
        <Head>
          <title>Graminate | Cattle Rearing</title>
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
        <title>Graminate | Cattle Rearing</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Cattle Records
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loadingCattle
                ? "Loading records..."
                : `${filteredCattleRecords.length} Record(s) found ${
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
              text="Add Cattle Record"
              style="primary"
              onClick={() => {
                setEditingCattle(null);
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
              {cattleCardData.map((card, index) => (
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
        {loadingCattle && !cattleRecords.length ? (
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
            totalRecordCount={filteredCattleRecords.length}
            onRowClick={(row) => {
              const cattleId = row[0] as number;
              const cattleName = row[1] as string;
              if (parsedUserId && cattleId) {
                router.push({
                  pathname: `/platform/${parsedUserId}/cattle_rearing/${cattleId}`,
                  query: { cattleName: encodeURIComponent(cattleName) },
                });
              }
            }}
            view={view}
            loading={loadingCattle && cattleRecords.length > 0}
            reset={true}
            hideChecks={false}
            download={true}
          />
        )}
        {isSidebarOpen && (
          <CattleForm
            onClose={() => {
              setIsSidebarOpen(false);
              setEditingCattle(null);
            }}
            formTitle={
              editingCattle ? "Edit Cattle Record" : "Add New Cattle Record"
            }
            cattleToEdit={editingCattle}
            onCattleUpdateOrAdd={handleCattleFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default CattleRearingPage;
