import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Head from "next/head";
import {
  subDays as subDaysDateFns,
  addDays as addDaysDateFns,
  format as formatDateFns,
  parseISO,
} from "date-fns";
import Swal from "sweetalert2";

import PlatformLayout from "@/layout/PlatformLayout";
import Calendar from "@/components/ui/Calendar/Calendar";
import FirstLoginModal from "@/components/modals/FirstLoginModal";
import InfoModal from "@/components/modals/InfoModal";
import WidgetModal from "@/components/modals/WidgetModal";
import TrendGraph from "@/components/cards/finance/TrendGraph";
import CompareGraph from "@/components/cards/finance/CompareGraph";

import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  TimeFormatOption,
} from "@/contexts/UserPreferencesContext";

type User = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  business_name?: string;
  imageUrl?: string | null;
  language?: string;
  time_format?: string;
  type?: string;
  sub_type?: string[];
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  widgets?: string[];
};

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

const TOTAL_DAYS_FOR_HISTORICAL_DATA = 180;
const today = new Date();
today.setHours(0, 0, 0, 0);

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

const Dashboard = () => {
  const router = useRouter();
  const userId = router.isReady ? (router.query.user_id as string) : undefined;
  const [userData, setUserData] = useState<User | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState<boolean>(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [fetchErrorModal, setFetchErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });

  const [financeSubTypes, setFinanceSubTypes] = useState<string[]>([]);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [fullHistoricalData, setFullHistoricalData] = useState<
    DailyFinancialEntry[]
  >([]);

  const { timeFormat, setTimeFormat, widgets, setWidgets, updateUserWidgets } =
    useUserPreferences();

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!router.isReady || !userId) return;

    let isMounted = true;
    setIsUserDataLoading(true);

    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const fetchedUser = response.data?.data?.user as User | undefined;
        if (fetchedUser) {
          if (!isMounted) return;
          setUserData(fetchedUser);
          if (fetchedUser.time_format) {
            setTimeFormat(fetchedUser.time_format as TimeFormatOption);
          }
          setWidgets(fetchedUser.widgets || []);
          if (!fetchedUser.business_name || !fetchedUser.type) {
            setIsSetupModalOpen(true);
          }
        } else {
          throw new Error("Invalid response: user not found");
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        let errorTitle = "Error";
        let errorText = "Failed to fetch user data. Please try again later.";
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            errorTitle = "Access Denied";
            errorText = "Session expired. Please log in again.";
          }
        }
        setFetchErrorModal({
          isOpen: true,
          title: errorTitle,
          text: errorText,
        });
      } finally {
        if (isMounted) {
          setIsUserDataLoading(false);
        }
      }
    };

    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [router.isReady, userId, router, setTimeFormat, setWidgets]);

  const processSalesData = useCallback(
    (
      sales: SaleRecord[],
      userSubTypes: string[]
    ): Map<string, MetricBreakdown> => {
      const dailyRevenueMap = new Map<string, MetricBreakdown>();
      const occupationsEncountered = new Set<string>(userSubTypes);
      sales.forEach((sale) => {
        occupationsEncountered.add(sale.occupation || "Uncategorized");
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);
      sales.forEach((sale) => {
        const saleDateStr = formatDateFns(
          parseISO(sale.sales_date),
          "yyyy-MM-dd"
        );
        let totalSaleAmount = (sale.quantities_sold || []).reduce(
          (acc, qty, i) => acc + qty * (sale.prices_per_unit?.[i] || 0),
          0
        );
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
        const occupationEntry = dayData.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) occupationEntry.value += totalSaleAmount;
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
        occupationsEncountered.add(expense.occupation || "Uncategorized");
      });
      const allRelevantOccupations = Array.from(occupationsEncountered);
      expenses.forEach((expense) => {
        const expenseDateStr = formatDateFns(
          parseISO(expense.date_created),
          "yyyy-MM-dd"
        );
        const expenseAmount = Number(expense.expense) || 0;
        const occupation = expense.occupation || "Uncategorized";
        const mainCategoryGroup = categoryToMainGroup[expense.category];
        let expenseType: "cogs" | "expenses" | null =
          mainCategoryGroup === EXPENSE_TYPE_MAP.COGS
            ? "cogs"
            : mainCategoryGroup === EXPENSE_TYPE_MAP.OPERATING_EXPENSES
            ? "expenses"
            : null;
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
        const occupationEntry = targetMetricBreakdown.breakdown.find(
          (b) => b.name === occupation
        );
        if (occupationEntry) occupationEntry.value += expenseAmount;
      });
      return dailyExpensesMap;
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      setIsFinanceLoading(false);
      return;
    }
    const fetchFinanceData = async () => {
      setIsFinanceLoading(true);
      try {
        const [userResponse, salesResponse, expensesResponse] =
          await Promise.all([
            axiosInstance.get(`/user/${userId}`),
            axiosInstance.get<{ sales: SaleRecord[] }>(`/sales/user/${userId}`),
            axiosInstance.get<{ expenses: ExpenseRecord[] }>(
              `/expenses/user/${userId}`
            ),
          ]);
        const fetchedSubTypes = userResponse.data.data?.user?.sub_type || [];
        const salesRecords = salesResponse.data.sales || [];
        const expenseRecords = expensesResponse.data.expenses || [];
        const processedSales = processSalesData(salesRecords, fetchedSubTypes);
        const processedExpenses = processExpensesData(
          expenseRecords,
          fetchedSubTypes
        );
        const allSubTypes = new Set(fetchedSubTypes);
        salesRecords.forEach((s) =>
          allSubTypes.add(s.occupation || "Uncategorized")
        );
        expenseRecords.forEach((e) =>
          allSubTypes.add(e.occupation || "Uncategorized")
        );
        setFinanceSubTypes(Array.from(allSubTypes) as string[]);
        const generatedData = generateDailyFinancialData(
          TOTAL_DAYS_FOR_HISTORICAL_DATA,
          Array.from(allSubTypes) as string[],
          processedSales,
          processedExpenses
        );
        setFullHistoricalData(generatedData);
      } catch (error) {
        console.error("Dashboard: Error fetching financial data:", error);
        Swal.fire("Error", "Could not load financial widget data.", "error");
      } finally {
        setIsFinanceLoading(false);
      }
    };
    fetchFinanceData();
  }, [userId, processSalesData, processExpensesData]);

  const handleFirstLogin = async (
    businessName: string,
    businessType: string,
    subType?: string[],
    addressLine1?: string,
    addressLine2?: string,
    city?: string,
    state?: string,
    postalCode?: string
  ) => {
    try {
      await axiosInstance.put(`/user/${userId}`, {
        business_name: businessName,
        type: businessType,
        sub_type: subType,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        state,
        postal_code: postalCode,
      });
      setSuccessModal({
        isOpen: true,
        title: "Welcome!",
        text: "Your account is now set up. Let’s get started 🚀",
      });
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              business_name: businessName,
              type: businessType,
              sub_type: subType,
              address_line_1: addressLine1,
              address_line_2: addressLine2,
              city,
              state,
              postal_code: postalCode,
            }
          : prev
      );
    } catch (error) {
      console.error("Error updating business info:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        text: "Failed to update business info. Please try again.",
      });
    }
  };

  const handleSaveWidgets = async (newWidgets: string[]) => {
    if (!userId) return;
    try {
      await updateUserWidgets(userId, newWidgets);
      setIsWidgetModalOpen(false);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        text: "Failed to update widgets. Please try again.",
      });
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: timeFormat === "12-hour",
    });

  return (
    <>
      <Head>
        <title>{`Dashboard ${
          userData ? `- ${userData.first_name}` : ""
        } | Graminate Platform`}</title>
      </Head>
      <PlatformLayout>
        <div className="p-4 sm:p-6">
          <header className="mb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
              <div>
                <h1 className="text-lg font-semibold text-dark dark:text-light">
                  {isUserDataLoading
                    ? "Loading..."
                    : `Hello ${userData?.first_name || "User"},`}
                </h1>
                <p className="text-dark dark:text-light">
                  Welcome to your dashboard.
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 mt-2 sm:mt-0">
                <div className="text-sm text-dark dark:text-light sm:text-right">
                  <p className="font-semibold">{formatDate(currentDateTime)}</p>
                  <p>{formatTime(currentDateTime)}</p>
                </div>
              </div>
            </div>
          </header>

          <hr className="mb-6 border-gray-400 dark:border-gray-700" />

          <div className="flex flex-col items-start sm:items-end gap-2 mt-2 sm:mt-0">
            <div
              className="flex items-center cursor-pointer text-sm text-blue-200 dark:hover:text-blue-300"
              onClick={() => setIsWidgetModalOpen(true)}
            >
              Manage Widgets
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {widgets.includes("Task Calendar") && <Calendar />}
            </div>

            {widgets.includes("Trend Graph") && (
              <div>
                <TrendGraph
                  initialFullHistoricalData={fullHistoricalData}
                  initialSubTypes={financeSubTypes}
                  isLoadingData={isFinanceLoading}
                />
              </div>
            )}
            {widgets.includes("Compare Graph") && (
              <div>
                <CompareGraph
                  initialFullHistoricalData={fullHistoricalData}
                  isLoadingData={isFinanceLoading}
                />
              </div>
            )}
          </div>
        </div>
      </PlatformLayout>

      {isSetupModalOpen && userId && (
        <FirstLoginModal
          isOpen={isSetupModalOpen}
          userId={userId}
          onSubmit={handleFirstLogin}
          onClose={() => setIsSetupModalOpen(false)}
        />
      )}

      <WidgetModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onSave={handleSaveWidgets}
        initialSelectedWidgets={widgets}
      />

      <InfoModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
        title={successModal.title}
        text={successModal.text}
        variant="success"
      />

      <InfoModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        text={errorModal.text}
        variant="error"
      />

      <InfoModal
        isOpen={fetchErrorModal.isOpen}
        onClose={() => {
          setFetchErrorModal((prev) => ({ ...prev, isOpen: false }));
          router.push("/");
        }}
        title={fetchErrorModal.title}
        text={fetchErrorModal.text}
        variant="error"
      />
    </>
  );
};

export default Dashboard;
