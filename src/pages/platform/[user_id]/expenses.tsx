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

const salesTableColumns = [
  "#",
  "Sale Name",
  "Date",
  "Occupation",
  "Commodity",
  "Quantities",
  "Price/Unit",
  "Unit",
  "Invoice",
  "Logged At",
];

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

const SalesAndExpensesPage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const currentUserId = useMemo(
    () => (Array.isArray(user_id) ? user_id[0] : user_id),
    [user_id]
  );

  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(true);

  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [salesSearchQuery, setSalesSearchQuery] = useState("");
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const [salesItemsPerPage, setSalesItemsPerPage] = useState(25);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [expensesData, setExpensesData] = useState<ExpenseRecord[]>([]);
  const [expensesSearchQuery, setExpensesSearchQuery] = useState("");
  const [expensesCurrentPage, setExpensesCurrentPage] = useState(1);
  const [expensesItemsPerPage, setExpensesItemsPerPage] = useState(25);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchSalesData = useCallback(async () => {
    if (!currentUserId) {
      setIsSalesLoading(false);
      return;
    }
    setIsSalesLoading(true);
    try {
      const response = await axiosInstance.get<{ sales: SaleRecord[] }>(
        `/sales/user/${currentUserId}`
      );
      setSalesData(response.data.sales || []);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setSalesData([]);
      Swal.fire("Error", "Could not fetch sales data.", "error");
    } finally {
      setIsSalesLoading(false);
    }
  }, [currentUserId]);

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
    fetchSalesData();
    fetchExpensesData();
  }, [currentUserId, fetchSalesData, fetchExpensesData]);

  const filteredSalesRows = useMemo(() => {
    return salesData
      .map(
        (sale): TableRowType => [
          sale.sales_id,
          sale.sales_name || "-",
          new Date(sale.sales_date).toLocaleDateString(),
          sale.occupation || "-",
          sale.items_sold,
          sale.quantities_sold,
          sale.prices_per_unit
            ? sale.prices_per_unit.map((p) => parseFloat(String(p)).toFixed(2))
            : sale.items_sold.map(() => "-"),
          sale.quantity_unit || "-",
          sale.invoice_created,
          new Date(sale.created_at).toLocaleString(),
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
            .includes(salesSearchQuery.toLowerCase());
        })
      );
  }, [salesData, salesSearchQuery]);

  const salesTableDataFormatted: TableDataFormat = {
    columns: salesTableColumns,
    rows: filteredSalesRows,
  };

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

  const handleSaleAdded = () => {
    fetchSalesData();
    setIsSalesModalOpen(false);
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

  const isLoading = isUserDetailsLoading || isSalesLoading || isExpensesLoading;

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
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <h1 className="text-xl font-semibold dark:text-white">
                Financial Records
              </h1>
            </div>
          </header>

          {isLoading && !salesData.length && !expensesData.length ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <h2 className="text-lg font-semibold dark:text-white">
                      Sales Records
                    </h2>
                  </div>
                  <Button
                    text="Log New Sale"
                    style="primary"
                    onClick={() => setIsSalesModalOpen(true)}
                  />
                </div>
                <SalesTable
                  data={salesTableDataFormatted}
                  filteredRows={filteredSalesRows}
                  currentPage={salesCurrentPage}
                  setCurrentPage={setSalesCurrentPage}
                  itemsPerPage={salesItemsPerPage}
                  setItemsPerPage={setSalesItemsPerPage}
                  paginationItems={paginationItems}
                  searchQuery={salesSearchQuery}
                  setSearchQuery={setSalesSearchQuery}
                  totalRecordCount={filteredSalesRows.length}
                  onRowClick={handleSalesRowClick}
                  view="sales"
                  loading={isSalesLoading}
                  onDataMutated={fetchSalesData}
                  download={true}
                  reset={true}
                  currentUserId={currentUserId}
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
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
                </div>
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

      {isSalesModalOpen && currentUserId && (
        <SalesModal
          isOpen={isSalesModalOpen}
          onClose={() => setIsSalesModalOpen(false)}
          userId={currentUserId}
          onSaleAdded={handleSaleAdded}
        />
      )}

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

export default SalesAndExpensesPage;
