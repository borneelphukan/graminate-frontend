import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";

import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";

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

const Expenses = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;

  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const fetchUserDetailsAndGenerateData = async () => {
      let fetchedSubTypes: string[] = [];
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
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
        console.error("FinancePage: Error fetching user details:", error);
      }

      setIsLoadingData(false);
    };

    fetchUserDetailsAndGenerateData();
  }, [userId]);

  return (
    <>
      <Head>
        <title>Expense Tracker | Graminate</title>
        <meta
          name="description"
          content="Track and manage your farm finances"
        />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4 sm:p-6">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <h1 className="text-xl font-semibold dark:text-white ml-3">
                Expense Tracker
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
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"></div>
          )}

          <div className="mt-8"></div>

          <div className="mt-8"></div>
        </main>
      </PlatformLayout>
    </>
  );
};

export default Expenses;
