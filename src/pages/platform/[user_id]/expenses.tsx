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
import SalesModal from "@/components/modals/SalesModal";
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

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

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
        console.error("Sales Page: Error fetching user details:", error);
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
          sale.prices_per_unit
            ? sale.prices_per_unit.map((p) => p.toFixed(2))
            : sale.items_sold.map(() => "-"),
          sale.quantity_unit,
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
    setIsSalesModalOpen(false);
    Swal.fire("Success", "Sale logged successfully!", "success");
  };

  const handleSalesRowClick = (row: SalesTableRowType) => {
    console.log("Sale row clicked:", row);
  };

  const isLoading = isUserDetailsLoading || isSalesLoading;

  return (
    <>
      <Head>
        <title>Sales Tracker | Graminate</title>
        <meta name="description" content="Track and manage your farm sales" />
      </Head>
      <PlatformLayout>
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-3 sm:mb-0">
              <h1 className="text-xl font-semibold dark:text-white">
                Sales Tracker
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
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <h2 className="text-lg font-semibold dark:text-white">
                      Recent Sales
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

      {isSalesModalOpen && (
        <SalesModal
          isOpen={isSalesModalOpen}
          onClose={() => setIsSalesModalOpen(false)}
          userId={currentUserId}
          onSaleAdded={handleSaleAdded}
        />
      )}
    </>
  );
};

export default Expenses;
