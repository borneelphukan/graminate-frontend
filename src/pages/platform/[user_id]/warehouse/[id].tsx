import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import Table from "@/components/tables/Table";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { PAGINATION_ITEMS } from "@/constants/options";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import InventoryForm from "@/components/form/InventoryForm";
import WarehouseForm from "@/components/form/WarehouseForm";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWarehouse,
  faMapMarkerAlt,
  faUserTie,
  faPhone,
  faBoxOpen,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type ItemRecord = {
  inventory_id: number;
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  created_at: string;
  price_per_unit: number;
  warehouse_id: number | null;
  minimum_limit?: number;
  status?: string;
};

type WarehouseDetails = {
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

const getBarColor = (quantity: number, max: number) => {
  if (max === 0 && quantity === 0) return "#6B7280";
  if (max === 0 && quantity > 0) return "#04ad79";
  const ratio = quantity / max;
  if (ratio < 0.25) return "#e53e3e";
  if (ratio < 0.5) return "orange";
  if (ratio < 0.75) return "#facd1d";
  return "#04ad79";
};

const generateColors = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `hsl(${(i * 360) / count}, 70%, 60%)`
  );

const WarehouseInventoryPage = () => {
  const router = useRouter();
  const {
    user_id: queryUserId,
    id: queryId,
    warehouseName: queryWarehouseName,
  } = router.query;

  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;
  const parsedId = Array.isArray(queryId) ? queryId[0] : queryId;

  const warehouseNameFromQuery = queryWarehouseName
    ? decodeURIComponent(
        Array.isArray(queryWarehouseName)
          ? queryWarehouseName[0]
          : queryWarehouseName
      )
    : "Warehouse";

  const [inventoryForWarehouse, setInventoryForWarehouse] = useState<
    ItemRecord[]
  >([]);
  const [currentWarehouseDetails, setCurrentWarehouseDetails] =
    useState<WarehouseDetails | null>(null);
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingWarehouseDetails, setLoadingWarehouseDetails] = useState(true);

  const [chartThemeColors, setChartThemeColors] = useState({
    textColor: "#333",
    gridColor: "#DDD",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setChartThemeColors({
        textColor: isDarkMode ? "#CCC" : "#333",
        gridColor: isDarkMode ? "#444" : "#DDD",
      });
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || !parsedUserId || !parsedId) {
      if (router.isReady && parsedUserId && !parsedId) {
        setInventoryForWarehouse([]);
        setLoadingInventory(false);
        setCurrentWarehouseDetails(null);
        setLoadingWarehouseDetails(false);
      }
      return;
    }

    const fetchWarehouseData = async () => {
      setLoadingInventory(true);
      setLoadingWarehouseDetails(true);
      try {
        const [inventoryResponse, warehouseDetailsResponse] = await Promise.all(
          [
            axiosInstance.get(`/inventory/${parsedUserId}`, {
              params: { warehouse_id: parsedId },
            }),
            axiosInstance.get(`/warehouse/user/${parsedUserId}`),
          ]
        );

        setInventoryForWarehouse(inventoryResponse.data.items || []);

        const warehouses = warehouseDetailsResponse.data.warehouses || [];
        const foundWarehouse = warehouses.find(
          (wh: WarehouseDetails) =>
            wh.warehouse_id === parseInt(parsedId as string, 10)
        );
        setCurrentWarehouseDetails(foundWarehouse || null);
      } catch (error) {
        console.error("Error fetching warehouse-specific data:", error);
        setInventoryForWarehouse([]);
        setCurrentWarehouseDetails(null);
      } finally {
        setLoadingInventory(false);
        setLoadingWarehouseDetails(false);
      }
    };

    fetchWarehouseData();
  }, [router.isReady, parsedUserId, parsedId]);

  const searchedInventory = useMemo(() => {
    if (!searchQuery) {
      return inventoryForWarehouse;
    }
    return inventoryForWarehouse.filter(
      (item) =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_group.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventoryForWarehouse, searchQuery]);

  const tableData = useMemo(() => {
    return {
      columns: [
        "#",
        "Commodity",
        "Category",
        "Units",
        "Quantity",
        "Min. Limit",
        "Price / Unit (₹)",
        "Status",
      ],
      rows: searchedInventory.map((item) => [
        item.inventory_id,
        item.item_name,
        item.item_group,
        item.units,
        item.quantity,
        item.minimum_limit != null && item.minimum_limit > 0
          ? item.minimum_limit
          : "N/A",
        item.price_per_unit,
        item.status || "",
      ]),
    };
  }, [searchedInventory]);

  const maxQuantity = Math.max(
    0,
    ...inventoryForWarehouse.map((item) => item.quantity)
  );
  const groups = Array.from(
    new Set(inventoryForWarehouse.map((item) => item.item_group))
  );
  const pieColors = generateColors(inventoryForWarehouse.length);

  const chartData = useMemo(
    () => ({
      labels: groups,
      datasets: inventoryForWarehouse.map((item) => ({
        label: item.item_name,
        data: groups.map((group) =>
          group === item.item_group ? item.quantity : null
        ),
        backgroundColor: getBarColor(item.quantity, maxQuantity),
      })),
    }),
    [groups, inventoryForWarehouse, maxQuantity]
  );

  const dynamicWarehouseName =
    currentWarehouseDetails?.name || warehouseNameFromQuery;

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Item Quantities in ${dynamicWarehouseName} by Category`,
          color: chartThemeColors.textColor,
        },
      },
      scales: {
        x: {
          stacked: false,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
          ticks: { color: chartThemeColors.textColor },
          grid: { color: chartThemeColors.gridColor },
        },
        y: {
          stacked: false,
          ticks: { color: chartThemeColors.textColor },
          grid: { color: chartThemeColors.gridColor },
        },
      },
    }),
    [dynamicWarehouseName, chartThemeColors]
  );

  const totalAssetValue = inventoryForWarehouse.reduce(
    (acc, item) =>
      acc + Number(item.price_per_unit || 0) * (item.quantity || 0),
    0
  );

  const cumulativeAddress = useMemo(() => {
    if (!currentWarehouseDetails) return "";
    return [
      currentWarehouseDetails.address_line_1,
      currentWarehouseDetails.address_line_2,
      currentWarehouseDetails.city,
      currentWarehouseDetails.state,
      currentWarehouseDetails.postal_code,
      currentWarehouseDetails.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, [currentWarehouseDetails]);

  const lowStockItems = useMemo(() => {
    return inventoryForWarehouse.filter(
      (item) =>
        item.minimum_limit != null &&
        item.minimum_limit > 0 &&
        item.quantity < item.minimum_limit
    );
  }, [inventoryForWarehouse]);

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | {dynamicWarehouseName} - Inventory</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Inventory for{" "}
                <span className="text-primary">{dynamicWarehouseName}</span>
              </h1>
              <p className="text-sm text-gray-300 mt-1">
                {loadingInventory
                  ? "Loading items..."
                  : `${searchedInventory.length} Item(s) in this Warehouse ${
                      searchQuery ? "(filtered)" : ""
                    }`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                arrow="left"
                text="All Warehouses"
                style="secondary"
                onClick={() => router.push(`/platform/${parsedUserId}/storage`)}
              />
              {parsedId && currentWarehouseDetails && (
                <Button
                  text="Edit Warehouse"
                  style="secondary"
                  onClick={() => setIsWarehouseFormOpen(true)}
                  isDisabled={loadingWarehouseDetails}
                />
              )}
              <Button
                text="Add Item"
                style="primary"
                add
                onClick={() => setIsInventoryFormOpen(true)}
                isDisabled={!parsedId}
              />
            </div>
          </div>

          {!loadingWarehouseDetails && currentWarehouseDetails && (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={faWarehouse}
                    className="mr-3 w-4 h-4 text-blue-200"
                  />
                  <div>
                    <span className="font-semibold block">Type</span>
                    {currentWarehouseDetails.type}
                  </div>
                </div>
                {currentWarehouseDetails.storage_capacity != null && (
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faBoxOpen}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Area</span>
                      {currentWarehouseDetails.storage_capacity} sq. ft.
                    </div>
                  </div>
                )}
                {currentWarehouseDetails.contact_person && (
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faUserTie}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">
                        Contact Person
                      </span>
                      {currentWarehouseDetails.contact_person}
                    </div>
                  </div>
                )}
                {currentWarehouseDetails.phone && (
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faPhone}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Phone</span>
                      {currentWarehouseDetails.phone}
                    </div>
                  </div>
                )}
                {cumulativeAddress && (
                  <div className="flex items-center md:col-span-2 lg:col-span-1">
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      className="mr-3 w-4 h-4 text-blue-200"
                    />
                    <div>
                      <span className="font-semibold block">Address</span>
                      {cumulativeAddress}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {inventoryForWarehouse.length > 0 && !loadingInventory && (
          <div className="mb-6 dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex flex-col lg:flex-row gap-6 justify-between">
              <div className="flex-1">
                <Bar data={chartData} options={chartOptions} />
              </div>
              <div className="flex flex-col gap-4 lg:w-1/3">
                <div className="p-4 bg-gray-500 dark:bg-gray-700 rounded-xl shadow text-center">
                  <p className="text-lg font-medium text-gray-700 dark:text-light">
                    Total Asset Value
                  </p>
                  <p className="text-3xl font-bold text-dark dark:text-light mt-2">
                    ₹
                    {totalAssetValue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="p-4">
                  <h2 className="text-sm font-semibold text-center text-dark dark:text-light mb-2">
                    Inventory Share by Quantity
                  </h2>
                  <div className="w-full max-w-[250px] mx-auto">
                    <Pie
                      data={{
                        labels: inventoryForWarehouse.map(
                          (item) => item.item_name
                        ),
                        datasets: [
                          {
                            label: "Share by Quantity",
                            data: inventoryForWarehouse.map(
                              (item) => item.quantity
                            ),
                            backgroundColor: pieColors,
                            borderWidth: 1,
                            borderColor: "#fff dark:#888",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-sm dark:text-gray-300 text-gray-700">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-red-200 rounded-sm" />
                {"< 25%"} of Maximum
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-orange-500 rounded-sm" />
                {"< 50%"} of Maximum
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 rounded-sm"
                  style={{ backgroundColor: "#facd1d" }}
                />
                {"< 75%"} of Maximum
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 rounded-sm"
                  style={{ backgroundColor: "#04ad79" }}
                />
                {"≥ 75%"} of Maximum
              </div>
            </div>

            {lowStockItems.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-red-200 dark:text-red-400 mb-4 flex items-center">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="mr-2 w-5 h-5 text-red-200 dark:text-red-400"
                  />
                  Low Stock Alerts
                </h3>
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.inventory_id}
                      className="p-3 bg-red-400 dark:bg-red-900/30 border border-red-300 dark:border-red-700/60 rounded-lg text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center"
                    >
                      <div className="flex-grow mb-1 sm:mb-0">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {item.item_name}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 ml-1">
                          ({item.item_group})
                        </span>
                      </div>
                      <div className="text-red-600 dark:text-red-400 sm:text-right whitespace-nowrap">
                        <span className="font-medium">
                          Qty: {item.quantity}
                        </span>
                        <span className="ml-2 text-xs">
                          (Min: {item.minimum_limit})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
          totalRecordCount={searchedInventory.length}
          view="inventory"
          loading={loadingInventory}
          reset={true}
          hideChecks={false}
          download={true}
        />

        {isInventoryFormOpen && parsedId && (
          <InventoryForm
            onClose={() => setIsInventoryFormOpen(false)}
            formTitle={`Add Item to ${dynamicWarehouseName}`}
            warehouseId={parseInt(parsedId, 10)}
          />
        )}
        {isWarehouseFormOpen && parsedId && currentWarehouseDetails && (
          <WarehouseForm
            onClose={() => setIsWarehouseFormOpen(false)}
            formTitle={`Edit ${currentWarehouseDetails.name}`}
            warehouseId={parseInt(parsedId, 10)}
            initialData={{
              name: currentWarehouseDetails.name,
              type: currentWarehouseDetails.type,
              address_line_1: currentWarehouseDetails.address_line_1 || "",
              address_line_2: currentWarehouseDetails.address_line_2 || "",
              city: currentWarehouseDetails.city || "",
              state: currentWarehouseDetails.state || "",
              postal_code: currentWarehouseDetails.postal_code || "",
              country: currentWarehouseDetails.country || "",
              contact_person: currentWarehouseDetails.contact_person || "",
              phone: currentWarehouseDetails.phone || "",
              storage_capacity:
                currentWarehouseDetails.storage_capacity?.toString() || "",
            }}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default WarehouseInventoryPage;
