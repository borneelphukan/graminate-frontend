import { useState, useEffect } from "react";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxesStacked } from "@fortawesome/free-solid-svg-icons";

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

type InventoryStockProps = {
  userId: string | undefined;
  title: string;
  category: string;
};

const InventoryStockCard = ({
  userId,
  title,
  category,
}: InventoryStockProps) => {
  const [inventoryItems, setInventoryItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !category) {
      setLoading(false);
      setInventoryItems([]);
      if (!category) {
        setError("Category not specified.");
      }
      if (!userId) {
        setError("User ID not specified.");
      }
      return;
    }

    const fetchInventoryItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/inventory/${userId}`, {
          params: { item_group: category },
        });
        setInventoryItems(response.data.items || []);
      } catch (err) {
        console.error(`Failed to fetch ${category} inventory:`, err);
        setError(`Failed to load ${category.toLowerCase()} inventory data.`);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryItems();
  }, [userId, category]);

  const getItemStatus = (
    item: ItemRecord
  ): { text: string; className: string } => {
    const { quantity, minimum_limit } = item;

    if (quantity === 0) {
      return { text: "Unavailable", className: "bg-red-400 text-white" };
    }

    const effectiveMinLimit = minimum_limit ?? 0;

    if (effectiveMinLimit > 0 && quantity < effectiveMinLimit) {
      return { text: "Limited", className: "bg-orange-300 text-white" };
    }
    return { text: "Available", className: "bg-green-200 text-white" };
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 h-80 flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
        {title}
      </h2>
      {loading && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            Loading inventory...
          </p>
        </div>
      )}
      {error && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      )}
      {!loading && !error && (
        <>
          {inventoryItems.length > 0 ? (
            <div className="flex-grow overflow-hidden">
              <ul className="space-y-3 h-full overflow-y-auto pr-2 pb-2 custom-scrollbar">
                {inventoryItems.map((item) => {
                  const statusInfo = getItemStatus(item);
                  return (
                    <li
                      key={item.inventory_id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-150"
                    >
                      <span className="text-sm text-dark dark:text-light flex-1 truncate pr-2">
                        {item.item_name}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {item.quantity} {item.units}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.className}`}
                        >
                          {statusInfo.text}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center flex-grow py-4">
              <FontAwesomeIcon
                icon={faBoxesStacked}
                className="w-12 h-12 text-gray-300 mb-3"
              />
              <p className="text-gray-300">
                No {category.toLowerCase()} items found in inventory.
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Add items with category "{category}" via Warehouse Inventory to
                see them here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryStockCard;
