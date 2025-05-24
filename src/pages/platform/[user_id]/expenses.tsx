import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import SalesTable, {
  RowType as TableRowType,
  TableData as TableDataFormat,
} from "@/components/tables/SalesTable";
import SalesModal from "@/components/modals/SalesModal";
import ExpenseModal from "@/components/modals/ExpenseModal";
import Swal from "sweetalert2";

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

const expensesTableColumns = [
  "#",
  "Title",
  "Amount ($)",
  "Category",
  "Occupation",
  "Date",
  "Logged At",
];

const paginationItems = ["25 per page", "50 per page", "100 per page"];

const Expenses = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const currentUserId = useMemo(
    () => (Array.isArray(user_id) ? user_id[0] : user_id),
    [user_id]
  );

  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(true);

  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [expensesData, setExpensesData] = useState<ExpenseRecord[]>([]);
  const [expensesSearchQuery, setExpensesSearchQuery] = useState("");
  const [expensesCurrentPage, setExpensesCurrentPage] = useState(1);
  const [expensesItemsPerPage, setExpensesItemsPerPage] = useState(25);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchExpensesData = useCallback(async () => {
    if (!currentUserId) {
      setIsExpensesLoading(false);
      return;
    }
    setIsExpensesLoading(true);
    try {
      const response = await axiosInstance.get<{ expenses: ExpenseRecord[] }>(
        `/expenses/user/${currentUserId}`
      );
      setExpensesData(response.data.expenses || []);
    } catch (error) {
      console.error("Error fetching expenses data:", error);
      setExpensesData([]);
      Swal.fire("Error", "Could not fetch expenses data.", "error");
    } finally {
      setIsExpensesLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentUserId) {
        setIsUserDetailsLoading(false);
        return;
      }
      setIsUserDetailsLoading(true);
      try {
        await axiosInstance.get(`/user/${currentUserId}`);
      } catch (error) {
        console.error("Page: Error fetching user details:", error);
      } finally {
        setIsUserDetailsLoading(false);
      }
    };

    fetchUserDetails();

    fetchExpensesData();
  }, [currentUserId, fetchExpensesData]);

  const filteredExpensesRows = useMemo(() => {
    return expensesData
      .map(
        (expense): TableRowType => [
          expense.expense_id,
          expense.title,
          parseFloat(String(expense.expense)).toFixed(2),
          expense.category,
          expense.occupation || "-",
          new Date(expense.date_created).toLocaleDateString(),
          new Date(expense.created_at).toLocaleString(),
        ]
      )
      .filter((row) =>
        row.some((cell) => {
          if (cell === null || cell === undefined) return false;
          const cellString = Array.isArray(cell)
            ? cell.join(" ")
            : String(cell);
          return cellString
            .toLowerCase()
            .includes(expensesSearchQuery.toLowerCase());
        })
      );
  }, [expensesData, expensesSearchQuery]);

  const expensesTableDataFormatted: TableDataFormat = {
    columns: expensesTableColumns,
    rows: filteredExpensesRows,
  };

  const handleExpenseAdded = () => {
    fetchExpensesData();
    setIsExpenseModalOpen(false);
  };

  const handleSalesRowClick = (row: TableRowType) => {
    console.log("Sale row clicked:", row);
  };

  const handleExpensesRowClick = (row: TableRowType) => {
    console.log("Expense row clicked:", row);
  };

  const isLoading = isUserDetailsLoading || isExpensesLoading;

  return (
    <>
      <Head>
        <title>Sales & Expenses | Graminate</title>
        <meta
          name="description"
          content="Track and manage your farm sales and expenses"
        />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4">
          {isLoading && !expensesData.length ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              <div>
                <header className="flex flex-col sm:flex-row justify-between items-center mb-4">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <h2 className="text-lg font-semibold dark:text-white">
                      Expense Records
                    </h2>
                  </div>
                  <Button
                    text="Log New Expense"
                    style="primary"
                    onClick={() => setIsExpenseModalOpen(true)}
                  />
                </header>
                <SalesTable
                  data={expensesTableDataFormatted}
                  filteredRows={filteredExpensesRows}
                  currentPage={expensesCurrentPage}
                  setCurrentPage={setExpensesCurrentPage}
                  itemsPerPage={expensesItemsPerPage}
                  setItemsPerPage={setExpensesItemsPerPage}
                  paginationItems={paginationItems}
                  searchQuery={expensesSearchQuery}
                  setSearchQuery={setExpensesSearchQuery}
                  totalRecordCount={filteredExpensesRows.length}
                  onRowClick={handleExpensesRowClick}
                  view="expenses"
                  loading={isExpensesLoading}
                  onDataMutated={fetchExpensesData}
                  download={true}
                  reset={true}
                  currentUserId={currentUserId}
                />
              </div>
            </>
          )}
        </main>
      </PlatformLayout>

      {isExpenseModalOpen && currentUserId && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          userId={currentUserId}
          onExpenseAdded={handleExpenseAdded}
        />
      )}
    </>
  );
};

export default Expenses;
