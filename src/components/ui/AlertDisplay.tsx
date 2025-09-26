import React, { useState, useEffect, useCallback } from "react";

export type Alert = {
  id: number;
  message: string;
  type: "Critical" | "Warning" | "Info" | "Default";
};

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

type Props = {
  temperature: number | null;
  formatTemperature: (
    celsiusValue: number | null,
    showUnit?: boolean
  ) => string;
  inventoryItems: ItemRecord[];
  loadingInventory: boolean;
  inventoryCategoryName: string;

  latestFutureAppointment?: string | null;
}

const AlertDisplay = ({
  temperature,
  formatTemperature,
  inventoryItems,
  loadingInventory,
  inventoryCategoryName,
  latestFutureAppointment,
}: Props) => {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  const getAlertStyle = useCallback((type: Alert["type"]): string => {
    switch (type) {
      case "Critical":
        return "bg-red-300 border-red-500 text-red-100 dark:bg-red-300 dark:border-red-600 dark:text-red-800";
      case "Warning":
        return "bg-yellow-200 border-yellow-500 text-yellow-100 dark:bg-yellow-200 dark:border-yellow-600 dark:text-yellow-800";
      case "Info":
        return "bg-blue-300 border-blue-500 text-blue-100 dark:bg-blue-300 dark:border-blue-600 dark:text-blue-800";
      default:
        return "bg-gray-300 border-gray-500 text-gray-700 dark:bg-gray-200 dark:border-gray-600 dark:text-gray-800";
    }
  }, []);

  useEffect(() => {
    const dynamicAlerts: Alert[] = [];
    let alertIdCounter = 1;


    if (!loadingInventory && inventoryItems.length > 0) {
      inventoryItems.forEach((item) => {
        if (
          item.minimum_limit != null &&
          item.minimum_limit > 0 &&
          item.quantity < item.minimum_limit
        ) {
          dynamicAlerts.push({
            id: alertIdCounter++,
            type: "Warning",
            message: `${item.item_name} (${inventoryCategoryName}) inventory low (Qty: ${item.quantity} ${item.units}, Min: ${item.minimum_limit} ${item.units})`,
          });
        }
      });
    }

    if (latestFutureAppointment && latestFutureAppointment !== "N/A") {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const visitDate = new Date(latestFutureAppointment);
        visitDate.setHours(0, 0, 0, 0);
        const diffInTime = visitDate.getTime() - today.getTime();
        const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));

        if (diffInDays <= 7 && diffInDays >= 0) {
          dynamicAlerts.push({
            id: alertIdCounter++,
            type: "Info",
            message: `Upcoming Veterinary visit in ${diffInDays} day${
              diffInDays !== 1 ? "s" : ""
            } (on ${new Date(latestFutureAppointment).toLocaleDateString()}).`,
          });
        }
      } catch (e) {
        console.error("Error parsing nextVisit date for alert:", e);
      }
    }

    setActiveAlerts(dynamicAlerts);
  }, [
    temperature,
    formatTemperature,
    inventoryItems,
    loadingInventory,
    inventoryCategoryName,
    latestFutureAppointment,
  ]);

  const dismissAlert = (id: number) => {
    setActiveAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`border-l-4 p-3 rounded-md flex justify-between items-center ${getAlertStyle(
            alert.type
          )}`}
          role="alert"
        >
          <div>
            <p className="font-bold">{alert.type}</p>
            <p className="text-sm">{alert.message}</p>
          </div>
          <button
            onClick={() => dismissAlert(alert.id)}
            className="text-xl font-semibold hover:opacity-75"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertDisplay;
