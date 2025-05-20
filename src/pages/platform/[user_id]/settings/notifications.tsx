import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SettingsBar from "@/components/layout/SettingsBar";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import Button from "@/components/ui/Button";
import { API_BASE_URL } from "@/constants/constants";
import Checkbox from "@/components/ui/Checkbox";

type NotificationSettings = {
  orders: {
    enabled: boolean;
    email: boolean;
    sms: boolean;
  };
  inventory: {
    enabled: boolean;
    lowStock: boolean;
    replenish: boolean;
  };
  weather: {
    enabled: boolean;
    alerts: boolean;
    forecasts: boolean;
  };
  system: {
    enabled: boolean;
    maintenance: boolean;
    updates: boolean;
  };
};

const NotificationPage = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    orders: {
      enabled: true,
      email: true,
      sms: false,
    },
    inventory: {
      enabled: true,
      lowStock: true,
      replenish: false,
    },
    weather: {
      enabled: false,
      alerts: true,
      forecasts: false,
    },
    system: {
      enabled: true,
      maintenance: true,
      updates: true,
    },
  });

  const [userType, setUserType] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/user/type/${router.query.user_id}`,
          {
            credentials: "include",
          }
        );
        if (res.ok) {
          const data = await res.json();
          setUserType(data.type);
        } else {
          console.error("Failed to fetch user type");
        }
      } catch (err) {
        console.error("Error fetching user type:", err);
      }
    };

    if (router.isReady && router.query.user_id) {
      fetchUserType();
    }
  }, [router.isReady, router.query.user_id]);

  const showWeatherAlerts = userType == "Producer";

  const handleToggle = (category: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], enabled: !prev[category].enabled },
    }));
  };

  const handleCheckboxChange = <T extends keyof NotificationSettings>(
    category: T,
    field: keyof NotificationSettings[T]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: !prev[category][field] },
    }));
  };

  return (
    <>
      <Head>
        <title>Settings | Notification</title>
      </Head>
      <PlatformLayout>
        <div className="flex min-h-screen">
          <SettingsBar />
          <main className="flex-1 px-4 sm:px-6 md:px-12">
            <div className="py-6">
              <div className="font-bold text-lg text-dark dark:text-light">
                Notifications
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Manage how you receive notifications for your operations
                </p>
                <Button text="Save Changes" style="primary" />
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Orders & Deliveries"
                  description="Receive updates about purchase orders and deliveries"
                  enabled={settings.orders.enabled}
                  onToggle={() => handleToggle("orders")}
                >
                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.orders.enabled ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="orders-email-notifications"
                      checked={settings.orders.email}
                      onChange={() => handleCheckboxChange("orders", "email")}
                      disabled={!settings.orders.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      Email Notifications
                    </span>
                  </label>
                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.orders.enabled ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="orders-sms-alerts"
                      checked={settings.orders.sms}
                      onChange={() => handleCheckboxChange("orders", "sms")}
                      disabled={!settings.orders.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      SMS Alerts
                    </span>
                  </label>
                </SectionCard>

                <SectionCard
                  title="Inventory Updates"
                  description="Get alerts about stock levels and supplies"
                  enabled={settings.inventory.enabled}
                  onToggle={() => handleToggle("inventory")}
                >
                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.inventory.enabled
                        ? "opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="inventory-low-stock"
                      checked={settings.inventory.lowStock}
                      onChange={() =>
                        handleCheckboxChange("inventory", "lowStock")
                      }
                      disabled={!settings.inventory.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      Low Stock Warnings
                    </span>
                  </label>
                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.inventory.enabled
                        ? "opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="inventory-replenish"
                      checked={settings.inventory.replenish}
                      onChange={() =>
                        handleCheckboxChange("inventory", "replenish")
                      }
                      disabled={!settings.inventory.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      Replenishment Reminders
                    </span>
                  </label>
                </SectionCard>

                {showWeatherAlerts && (
                  <SectionCard
                    title="Weather Alerts"
                    description="Important weather updates for your region"
                    enabled={settings.weather.enabled}
                    onToggle={() => handleToggle("weather")}
                  >
                    <label
                      className={`flex items-center space-x-3 ${
                        !settings.weather.enabled
                          ? "opacity-50"
                          : "cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        id="weather-alerts"
                        checked={settings.weather.alerts}
                        onChange={() =>
                          handleCheckboxChange("weather", "alerts")
                        }
                        disabled={!settings.weather.enabled}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm text-dark dark:text-light">
                        Severe Weather Alerts
                      </span>
                    </label>
                    <label
                      className={`flex items-center space-x-3 ${
                        !settings.weather.enabled
                          ? "opacity-50"
                          : "cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        id="weather-forecasts"
                        checked={settings.weather.forecasts}
                        onChange={() =>
                          handleCheckboxChange("weather", "forecasts")
                        }
                        disabled={!settings.weather.enabled}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm text-dark dark:text-light">
                        Daily Forecasts
                      </span>
                    </label>
                  </SectionCard>
                )}

                <SectionCard
                  title="System Updates"
                  description="Important updates about your ERP system"
                  enabled={settings.system.enabled}
                  onToggle={() => handleToggle("system")}
                >
                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.system.enabled ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="system-maintenance"
                      checked={settings.system.maintenance}
                      onChange={() =>
                        handleCheckboxChange("system", "maintenance")
                      }
                      disabled={!settings.system.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      Maintenance Notices
                    </span>
                  </label>

                  <label
                    className={`flex items-center space-x-3 ${
                      !settings.system.enabled ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id="system-updates"
                      checked={settings.system.updates}
                      onChange={() => handleCheckboxChange("system", "updates")}
                      disabled={!settings.system.enabled}
                      className="h-4 w-4 text-green-600"
                    />
                    <span className="text-sm text-dark dark:text-light">
                      Software Updates
                    </span>
                  </label>
                </SectionCard>
              </div>
            </div>
          </main>
        </div>
      </PlatformLayout>
    </>
  );
};

const SectionCard = ({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div
    className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm ${
      !enabled ? "opacity-75" : ""
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-dark dark:text-light">
          {title}
        </h3>
        <p className="mt-1 text-sm text-dark dark:text-light">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ${
            enabled ? "bg-green-200" : "bg-gray-300"
          }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
          duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
    <div className={`mt-6 space-y-4 ${enabled ? "" : "pointer-events-none"}`}>
      {children}
    </div>
  </div>
);

export default NotificationPage;
