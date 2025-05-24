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
  "Occupation",
  "Commodity",
  "Quantities",
  "Price/Unit",
  "Sale (₹)",
  "Invoice",
  "Logged At",
];

const paginationItems = ["25 per page", "50 per page", "100 per page"];

const Sales = () => {
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
        console.error("Page: Error fetching user details:", error);
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
        (sale): TableRowType => [
          sale.sales_id,
          sale.sales_name || "-",
          sale.occupation || "-",
          sale.items_sold,
          sale.quantities_sold,
          sale.prices_per_unit
            ? sale.prices_per_unit.map((p) => parseFloat(String(p)).toFixed(2))
            : sale.items_sold.map(() => "-"),
          sale.prices_per_unit
            ? sale.quantities_sold.reduce(
                (sum, qty, idx) =>
                  sum +
                  qty *
                    (sale.prices_per_unit && sale.prices_per_unit[idx]
                      ? sale.prices_per_unit[idx]
                      : 0),
                0
              ).toFixed(2)
            : "-",
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

  const handleSaleAdded = () => {
    fetchSalesData();
    setIsSalesModalOpen(false);
  };

  const handleSalesRowClick = (row: TableRowType) => {
    console.log("Sale row clicked:", row);
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
        <main className="min-h-screen bg-light dark:bg-gray-900 p-4">
          {isLoading && !salesData.length ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              <div className="mb-12">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-4">
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
                </header>
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
    </>
  );
};

export default Sales;
