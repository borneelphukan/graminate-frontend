import { useEffect, useState, useCallback, useMemo } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faBox,
  faCalendarAlt,
  faVectorSquare,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";
import Button from "@/components/ui/Button";
import AlertDisplay from "@/components/ui/AlertDisplay";
import Loader from "@/components/ui/Loader";
import axios from "axios";
import ApicultureForm from "@/components/form/apiculture/ApicultureForm";
import Table from "@/components/tables/Table";
import { PAGINATION_ITEMS } from "@/constants/options";
import HiveForm, { HiveData } from "@/components/form/apiculture/HiveForm";

type ApicultureDetail = {
  apiary_id: number;
  user_id: number;
  apiary_name: string;
  number_of_hives: number;
  area: number | null;
  created_at: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
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
  feed?: boolean;
};

const mapSupportedLanguageToLocale = (lang: SupportedLanguage): string => {
  switch (lang) {
    case "English":
      return "en";
    case "Hindi":
      return "hi";
    case "Assamese":
      return "as";
    default:
      return "en";
  }
};

const ApicultureDetailPage = () => {
  const router = useRouter();
  const { user_id, apiary_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const parsedApiaryId = Array.isArray(apiary_id) ? apiary_id[0] : apiary_id;
  const numericApiaryId = parsedApiaryId ? parseInt(parsedApiaryId, 10) : 0;

  const [selectedApiaryData, setSelectedApiaryData] =
    useState<ApicultureDetail | null>(null);
  const [loadingApiaryData, setLoadingApiaryData] = useState(true);
  const [showApiaryForm, setShowApiaryForm] = useState(false);

  const [hives, setHives] = useState<HiveData[]>([]);
  const [loadingHives, setLoadingHives] = useState(true);
  const [showHiveForm, setShowHiveForm] = useState(false);
  const [hiveSearchQuery, setHiveSearchQuery] = useState("");
  const [hiveCurrentPage, setHiveCurrentPage] = useState(1);
  const [hiveItemsPerPage, setHiveItemsPerPage] = useState(5);

  const [apicultureInventoryItems, setApicultureInventoryItems] = useState<
    ItemRecord[]
  >([]);
  const [loadingApicultureInventory, setLoadingApicultureInventory] =
    useState(true);
  const [temperature, setTemperature] = useState<number | null>(null);

  const {
    temperatureScale,
    timeFormat,
    language: currentLanguage,
  } = useUserPreferences();

  const convertToFahrenheit = useCallback(
    (celsius: number): number => Math.round(celsius * (9 / 5) + 32),
    []
  );
  const formatTemperature = useCallback(
    (celsiusValue: number | null, showUnit: boolean = true): string => {
      if (celsiusValue === null) return "N/A";
      let displayTemp =
        temperatureScale === "Fahrenheit"
          ? convertToFahrenheit(celsiusValue)
          : celsiusValue;
      let unit = temperatureScale === "Fahrenheit" ? "°F" : "°C";
      return showUnit
        ? `${Math.round(displayTemp)}${unit}`
        : `${Math.round(displayTemp)}°`;
    },
    [temperatureScale, convertToFahrenheit]
  );
  const formattedDateOverview = (
    dateString: string | undefined | null,
    includeTime: boolean = true
  ) => {
    if (!dateString) return "N/A";
    const locale = mapSupportedLanguageToLocale(currentLanguage);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      ...(includeTime && {
        hour: "numeric",
        minute: "numeric",
        hour12: timeFormat === "12-hour",
      }),
    };
    return new Date(dateString).toLocaleString(locale, options);
  };

  const formatDateForTable = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(
      mapSupportedLanguageToLocale(currentLanguage),
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  const fetchApiaryDetails = useCallback(async () => {
    if (!parsedApiaryId) return;
    setLoadingApiaryData(true);
    try {
      const response = await axiosInstance.get<ApicultureDetail>(
        `/apiculture/${parsedApiaryId}`
      );
      setSelectedApiaryData(response.data);
    } catch (error) {
      console.error("Error fetching apiary details:", error);
      setSelectedApiaryData(null);
    } finally {
      setLoadingApiaryData(false);
    }
  }, [parsedApiaryId]);

  const fetchHives = useCallback(async () => {
    if (!parsedApiaryId) return;
    setLoadingHives(true);
    try {
      const response = await axiosInstance.get(
        `/bee-hives/apiary/${parsedApiaryId}`
      );
      setHives(response.data.hives || []);
    } catch (error) {
      console.error("Error fetching hives:", error);
      setHives([]);
    } finally {
      setLoadingHives(false);
    }
  }, [parsedApiaryId]);

  useEffect(() => {
    if (parsedApiaryId) {
      fetchApiaryDetails();
      fetchHives();
    }
  }, [parsedApiaryId, fetchApiaryDetails, fetchHives]);

  useEffect(() => {
    if (!parsedUserId) {
      setLoadingApicultureInventory(false);
      setApicultureInventoryItems([]);
      return;
    }
    const fetchApicultureInventory = async () => {
      setLoadingApicultureInventory(true);
      try {
        const response = await axiosInstance.get(`/inventory/${parsedUserId}`, {
          params: { item_group: "Apiculture" },
        });
        setApicultureInventoryItems(response.data.items || []);
      } catch (error) {
        console.error("Error fetching apiculture inventory:", error);
        setApicultureInventoryItems([]);
      } finally {
        setLoadingApicultureInventory(false);
      }
    };
    fetchApicultureInventory();
  }, [parsedUserId]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await axios.get("/api/weather", {
          params: { lat, lon },
        });
        const newWeatherData = {
          temperature: Math.round(response.data.current.temperature2m),
          timestamp: Date.now(),
        };
        localStorage.setItem(
          "weatherDataApiculture",
          JSON.stringify(newWeatherData)
        );
        setTemperature(newWeatherData.temperature);
      } catch (error: unknown) {
        console.error("Failed to fetch weather data", error);
      }
    };
    const getLocationAndFetch = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            fetchWeather(position.coords.latitude, position.coords.longitude),
          () => console.error("Geolocation permission denied or error."),
          { enableHighAccuracy: true }
        );
      }
    };
    const cached = localStorage.getItem("weatherDataApiculture");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 2 * 60 * 1000) {
        setTemperature(parsed.temperature);
        return;
      }
    }
    getLocationAndFetch();
  }, []);

  const detailItems = useMemo(() => {
    if (!selectedApiaryData) return [];
    const { address_line_1, address_line_2, city, state, postal_code } =
      selectedApiaryData;
    const fullAddress = [
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    return [
      {
        label: "Address",
        value: fullAddress || "N/A",
        icon: faMapMarkerAlt,
      },
      {
        label: "Total Hives in Bee Yard",
        value: String(selectedApiaryData.number_of_hives),
        icon: faBox,
      },
      {
        label: "Area",
        value:
          selectedApiaryData.area != null
            ? `${selectedApiaryData.area} sq. m`
            : "N/A",
        icon: faVectorSquare,
      },
      {
        label: "Bee Yard Created On",
        value: formattedDateOverview(selectedApiaryData.created_at),
        icon: faCalendarAlt,
      },
    ];
  }, [selectedApiaryData, formattedDateOverview]);

  const hiveTableData = useMemo(() => {
    const filteredHives = hives.filter(
      (hive) =>
        hive.hive_name.toLowerCase().includes(hiveSearchQuery.toLowerCase()) ||
        (hive.hive_type &&
          hive.hive_type.toLowerCase().includes(hiveSearchQuery.toLowerCase()))
    );
    return {
      columns: [
        "#",
        "Name",
        "Type",
        "Installation Date",
        "Queen",
        "Pests",
        "Disease",
        "Honey Capacity (kg)",
      ],
      rows: filteredHives.map((hive) => [
        hive.hive_id,
        hive.hive_name,
        hive.hive_type || "N/A",
        formatDateForTable(hive.installation_date),
        hive.queen_status || "Unknown",
        hive.pest_infestation ? "Yes" : "No",
        hive.disease_detected ? "Yes" : "No",
        hive.honey_stores_kg !== undefined ? hive.honey_stores_kg : "N/A",
      ]),
    };
  }, [hives, hiveSearchQuery, currentLanguage, timeFormat]);

  const handleHiveFormSuccess = () => {
    setShowHiveForm(false);
    fetchHives();
    fetchApiaryDetails();
  };

  const handleApiaryFormSuccess = () => {
    setShowApiaryForm(false);
    fetchApiaryDetails();
  };

  return (
    <PlatformLayout>
      <Head>
        <title>
          Graminate |{" "}
          {selectedApiaryData
            ? selectedApiaryData.apiary_name
            : "Bee Yard Details"}
        </title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <AlertDisplay
          temperature={temperature}
          formatTemperature={formatTemperature}
          inventoryItems={apicultureInventoryItems}
          loadingInventory={loadingApicultureInventory}
          inventoryCategoryName="Apiculture"
          latestFutureAppointment={null}
        />

        <div className="mb-6 mt-2 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              {loadingApiaryData ? (
                <Loader />
              ) : selectedApiaryData ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Bee Yard Management
                  </h1>
                  <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
                    <span className="font-semibold">Bee Yard:</span>{" "}
                    {selectedApiaryData.apiary_name}
                  </h2>
                </>
              ) : (
                <h1 className="text-2xl font-bold text-red-200">
                  Bee Yard Details Not Available
                </h1>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedUserId && (
                <Button
                  text="All Bee Yards"
                  arrow="left"
                  style="secondary"
                  onClick={() =>
                    router.push(`/platform/${parsedUserId}/apiculture`)
                  }
                />
              )}
              {selectedApiaryData && !loadingApiaryData && (
                <>
                  <Button
                    text="Edit Bee Yard"
                    style="secondary"
                    onClick={() => setShowApiaryForm(true)}
                  />
                  <Button
                    text="Add Hive"
                    style="primary"
                    onClick={() => setShowHiveForm(true)}
                  />
                </>
              )}
            </div>
          </div>

          {loadingApiaryData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <Loader />
            </div>
          ) : selectedApiaryData ? (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {detailItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start p-2 rounded"
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className="mr-3 mt-1 w-4 h-4 text-blue-200 flex-shrink-0"
                    />
                    <div>
                      <span className="font-semibold block text-gray-700 dark:text-gray-300">
                        {" "}
                        {item.label}{" "}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {" "}
                        {item.value}{" "}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-center items-center h-full min-h-[150px]">
              <p className="text-gray-500 dark:text-gray-400">
                {" "}
                Bee Yard data could not be loaded.{" "}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold dark:text-white">
            Hives in this Bee Yard
          </h2>
          <Table
            data={{
              columns: hiveTableData.columns,
              rows: hiveTableData.rows,
            }}
            filteredRows={hiveTableData.rows}
            currentPage={hiveCurrentPage}
            setCurrentPage={setHiveCurrentPage}
            itemsPerPage={hiveItemsPerPage}
            setItemsPerPage={setHiveItemsPerPage}
            paginationItems={PAGINATION_ITEMS.filter(
              (item) => parseInt(item) <= 10
            )}
            searchQuery={hiveSearchQuery}
            setSearchQuery={setHiveSearchQuery}
            totalRecordCount={hiveTableData.rows.length}
            onRowClick={(row) => {
              const hiveId = row[0] as number;
              if (parsedUserId && numericApiaryId && hiveId) {
                router.push(
                  `/platform/${parsedUserId}/apiculture/${numericApiaryId}/${hiveId}`
                );
              }
            }}
            view="hives"
            loading={loadingHives}
            reset={true}
            download={true}
            hideChecks={false}
          />
        </div>
      </div>

      {showApiaryForm && selectedApiaryData && (
        <ApicultureForm
          onClose={() => setShowApiaryForm(false)}
          formTitle="Edit Bee Yard Details"
          apiaryToEdit={selectedApiaryData}
          onApiaryUpdateOrAdd={handleApiaryFormSuccess}
        />
      )}
      {showHiveForm && numericApiaryId > 0 && (
        <HiveForm
          onClose={() => setShowHiveForm(false)}
          formTitle={"Add New Hive"}
          onHiveUpdateOrAdd={handleHiveFormSuccess}
          apiaryId={numericApiaryId}
        />
      )}
    </PlatformLayout>
  );
};

export default ApicultureDetailPage;
