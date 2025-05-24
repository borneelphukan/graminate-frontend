import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import SalesTable, {
  RowType as SalesTableRowType,
  TableData as SalesTableData,
} from "@/components/tables/SalesTable";
import InputSalesModal from "@/components/modals/SalesModal";
import Swal from "sweetalert2";

type SaleRecord = {
  sales_id: number;
  user_id: number;
  sales_date: string;
  occupation?: string;
  sales_name?: string;
  items_sold: string[];
  quantities_sold: number[];
  quantity_unit?: string;
  invoice_created: boolean;
  created_at: string;
};

const salesTableColumns = [
  "#",
  "Date",
  "Occupation",
  "Sale Name",
  "Items Sold",
  "Quantities",
  "Unit",
  "Invoice",
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
  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [isInputSalesModalOpen, setIsInputSalesModalOpen] = useState(false); // State for modal visibility

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
        console.error("ExpensesPage: Error fetching user details:", error);
      } finally {
        setIsUserDetailsLoading(false);
      }
    };

    fetchUserDetails();
    fetchSalesData();
  }, [currentUserId, fetchSalesData]);

  const filteredSalesRows = useMemo(() => {
    return salesData
      .map(
        (sale): SalesTableRowType => [
          sale.sales_id,
          sale.sales_name,
          new Date(sale.sales_date).toLocaleDateString(),
          sale.occupation || "-",
          sale.items_sold,
          sale.quantities_sold,
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
          return cellString.toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
  }, [salesData, searchQuery]);

  const salesTableDataFormatted: SalesTableData = {
    columns: salesTableColumns,
    rows: filteredSalesRows,
  };

  const handleSaleAdded = () => {
    fetchSalesData();
    setIsInputSalesModalOpen(false); // Close modal on successful addition
  };

  const handleSalesRowClick = (row: SalesTableRowType) => {
    console.log("Sale row clicked:", row);
    // const saleId = row[0];
  };

  const isLoading = isUserDetailsLoading || isSalesLoading;

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
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4 sm:p-6">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <h1 className="text-xl font-semibold dark:text-white ml-3">
                Sales & Expense Tracker
              </h1>
            </div>
          </header>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <h1 className="text-lg font-semibold dark:text-white">
                      Recent Sales
                    </h1>
                  </div>
                  <Button
                    text="Log New Sale"
                    style="primary"
                    onClick={() => setIsInputSalesModalOpen(true)}
                  />
                </div>
                <SalesTable
                  data={salesTableDataFormatted}
                  filteredRows={filteredSalesRows}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  paginationItems={paginationItems}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  totalRecordCount={filteredSalesRows.length}
                  onRowClick={handleSalesRowClick}
                  view="sales"
                  loading={isSalesLoading}
                  onDataMutated={fetchSalesData}
                  download={true}
                  reset={true}
                />
              </div>
            </>
          )}
        </main>
      </PlatformLayout>

      {isInputSalesModalOpen && (
        <InputSalesModal
          isOpen={isInputSalesModalOpen}
          onClose={() => setIsInputSalesModalOpen(false)}
          userId={currentUserId}
          onSaleAdded={handleSaleAdded}
        />
      )}
    </>
  );
};

export default Expenses;
