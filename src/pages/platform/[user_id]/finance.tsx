import Head from "next/head";
import { useRouter } from "next/router";
import {
  faDollarSign,
  faShoppingCart,
  faChartPie,
  faCreditCard,
  faPiggyBank,
} from "@fortawesome/free-solid-svg-icons";

import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";
import BudgetCard from "@/components/cards/finance/BudgetCard";
import TrendGraph from "@/components/cards/finance/TrendGraph";

const Finance = () => {
  const router = useRouter();

  const currentDate = new Date();

  const revenue = 10000;
  const cogs = 4000;
  const expenses = 2000;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  const cardData = [
    {
      title: "Revenue",
      value: revenue,
      date: currentDate,
      icon: faDollarSign,
      bgColor: "bg-green-300 dark:bg-green-800",
      iconValueColor: "text-green-200 dark:text-green-200",
    },
    {
      title: "COGS",
      value: cogs,
      date: currentDate,
      icon: faShoppingCart,
      bgColor: "bg-yellow-300 dark:bg-yellow-500",
      iconValueColor: "text-yellow-200 dark:text-yellow-100",
    },
    {
      title: "Gross Profit",
      value: grossProfit,
      date: currentDate,
      icon: faChartPie,
      bgColor: "bg-cyan-300 dark:bg-cyan-600",
      iconValueColor: "text-cyan-200 dark:text-cyan-100",
    },
    {
      title: "Expenses",
      value: expenses,
      date: currentDate,
      icon: faCreditCard,
      bgColor: "bg-red-300 dark:bg-red-600",
      iconValueColor: "text-red-200 dark:text-red-100",
    },
    {
      title: "Net Profit",
      value: netProfit,
      date: currentDate,
      icon: faPiggyBank,
      bgColor: "bg-blue-300 dark:bg-blue-200",
      iconValueColor: "text-blue-200 dark:text-blue-100",
    },
  ];

  return (
    <>
      <Head>
        <title>Budget Tracker | Graminate</title>
        <meta
          name="description"
          content="Track and manage your farm budget stages"
        />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4 sm:p-6">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-300 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <Button
                text=""
                arrow="left"
                style="ghost"
                onClick={() => router.back()}
                aria-label="Go back"
              />
              <h1 className="text-xl font-semibold dark:text-white ml-3">
                Finance Tracker
              </h1>
            </div>
          </header>
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {cardData.map((card, index) => (
              <BudgetCard
                key={index}
                title={card.title}
                value={card.value}
                date={card.date}
                icon={card.icon}
                bgColor={card.bgColor}
                iconValueColor={card.iconValueColor}
              />
            ))}
          </div>

          <div className="mt-8">
            <TrendGraph />
          </div>
        </main>
      </PlatformLayout>
    </>
  );
};

export default Finance;
