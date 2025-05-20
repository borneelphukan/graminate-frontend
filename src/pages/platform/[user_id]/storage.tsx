import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import Table from "@/components/tables/Table";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS } from "@/constants/options";
import Head from "next/head";
import axiosInstance from "@/lib/utils/axiosInstance";
import WarehouseForm from "@/components/form/WarehouseForm";

type View = "warehouse";

type WarehouseRecord = {
  warehouse_id: number;
  user_id?: number;
  name: string;
  type: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  contact_person: string | null;
  phone: string | null;
  storage_capacity: number | string | null;
};

const WarehousePage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const view: View = "warehouse";

  const [warehouseRecords, setWarehouseRecords] = useState<WarehouseRecord[]>(
    []
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !parsedUserId) return;

    const fetchWarehouses = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(
          `/warehouse/user/${encodeURIComponent(parsedUserId)}`
        );
        setWarehouseRecords(response.data.warehouses || []);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error fetching warehouse data:", error.message);
        } else {
          console.error("Unknown error fetching warehouse data");
        }
        setWarehouseRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouses();
  }, [router.isReady, parsedUserId]);

  const filteredWarehouseRecords = useMemo(() => {
    if (!searchQuery) {
      return warehouseRecords;
    }
    return warehouseRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      const addressString = [
        item.address_line_1,
        item.address_line_2,
        item.city,
        item.state,
        item.postal_code,
        item.country,
      ]
        .filter(Boolean)
        .join(", ")
        .toLowerCase();

      return (
        item.name.toLowerCase().includes(searchTerm) ||
        item.type.toLowerCase().includes(searchTerm) ||
        addressString.includes(searchTerm) ||
        (item.contact_person &&
          item.contact_person.toLowerCase().includes(searchTerm)) ||
        (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
        (item.storage_capacity &&
          String(item.storage_capacity).toLowerCase().includes(searchTerm))
      );
    });
  }, [warehouseRecords, searchQuery]);

  const tableData = useMemo(() => {
    return {
      columns: [
        "#",
        "Name",
        "Type",
        "Address",
        "Contact Person",
        "Phone",
        "Storage Capacity",
      ],
      rows: filteredWarehouseRecords.map((item) => [
        item.warehouse_id,
        item.name,
        item.type,
        [
          item.address_line_1,
          item.address_line_2,
          item.city,
          item.state,
          item.postal_code,
          item.country,
        ]
          .filter(Boolean)
          .join(", "),
        item.contact_person || "N/A",
        item.phone || "N/A",
        item.storage_capacity != null ? String(item.storage_capacity) : "N/A",
      ]),
    };
  }, [filteredWarehouseRecords]);

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Storage</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center dark:bg-dark relative mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Your Warehouses
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loading
                ? "Loading records..."
                : `${filteredWarehouseRecords.length} Record(s) found ${
                    searchQuery ? "(filtered)" : ""
                  }`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              text="Add Warehouse"
              style="primary"
              add
              onClick={() => setIsSidebarOpen(true)}
            />
          </div>
        </div>

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
          totalRecordCount={filteredWarehouseRecords.length}
          onRowClick={(row) => {
            const warehouseId = row[0] as number;
            const warehouseName = row[1] as string;
            if (parsedUserId && warehouseId) {
              router.push({
                pathname: `/platform/${parsedUserId}/warehouse/${warehouseId}`,
                query: { warehouseName: encodeURIComponent(warehouseName) },
              });
            }
          }}
          view={view}
          loading={loading}
          reset={true}
          hideChecks={false}
          download={true}
        />

        {isSidebarOpen && (
          <WarehouseForm
            onClose={() => setIsSidebarOpen(false)}
            formTitle="Add New Warehouse"
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default WarehousePage;
