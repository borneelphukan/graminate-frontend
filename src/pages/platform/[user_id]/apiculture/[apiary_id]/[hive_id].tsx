import { useEffect, useState, useCallback, useMemo } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCalendarCheck,
  faCrown,
  faBug,
  faBiohazard,
  faExclamationTriangle,
  faWind,
  faStickyNote,
  faFlask,
  faTag,
  faHistory,
  faClipboardList,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import HiveForm, { HiveData } from "@/components/form/apiculture/HiveForm";
import axios from "axios";
import ApicultureEnvironmentCard from "@/components/cards/apiculture/EnvironmentCard";
import Table from "@/components/tables/Table";
import { PAGINATION_ITEMS } from "@/constants/options";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import ToggleSwitch from "@/components/ui/Switch/ToggleSwitch";
import InspectionModal, {
  InspectionData,
} from "@/components/modals/apiculture/InspectionModal";

type AlertMessage = {
  id: string;
  type: "warning" | "info";
  message: string;
};

type HiveView = "status" | "inspection";

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

const HiveDetailsPage = () => {
  const router = useRouter();
  const {
    user_id: userId,
    apiary_id: apiaryId,
    hive_id: hiveId,
  } = router.query;
  const numericHiveId = hiveId ? parseInt(hiveId as string, 10) : 0;

  const [hiveData, setHiveData] = useState<HiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHiveForm, setShowHiveForm] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [activeView, setActiveView] = useState<HiveView>("status");

  const [weatherData, setWeatherData] = useState<{
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    precipitation: number | null;
  }>({
    temperature: null,
    humidity: null,
    windSpeed: null,
    windDirection: null,
    precipitation: null,
  });
  const [weatherLoading, setWeatherLoading] = useState(true);

  const { language: currentLanguage, temperatureScale } = useUserPreferences();

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

  const formattedDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(
      mapSupportedLanguageToLocale(currentLanguage),
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  const fetchHiveDetails = useCallback(async () => {
    if (!hiveId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/bee-hives/${hiveId}`);
      setHiveData(response.data);
    } catch (error) {
      console.error("Error fetching hive details:", error);
      setHiveData(null);
      Swal.fire("Error", "Could not load hive details.", "error");
    } finally {
      setLoading(false);
    }
  }, [hiveId]);

  const fetchInspections = useCallback(async () => {
    if (!hiveId) return;
    setLoadingInspections(true);
    try {
      const response = await axiosInstance.get(
        `/hive-inspections/hive/${hiveId}`
      );
      setInspections(response.data.inspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      setInspections([]);
    } finally {
      setLoadingInspections(false);
    }
  }, [hiveId]);

  useEffect(() => {
    if (router.isReady) {
      fetchHiveDetails();
      fetchInspections();
    }
  }, [router.isReady, fetchHiveDetails, fetchInspections]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      setWeatherLoading(true);
      try {
        const response = await axios.get("/api/weather", {
          params: { lat, lon },
        });
        const { current } = response.data;
        const newWeatherData = {
          temperature: current.temperature2m,
          humidity: current.relativeHumidity2m,
          windSpeed: current.windSpeed10m,
          windDirection: current.windDirection10m,
          precipitation: current.precipitation,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          "weatherDataHiveDetail",
          JSON.stringify(newWeatherData)
        );
        setWeatherData(newWeatherData);
      } catch (error: unknown) {
        console.error("Failed to fetch weather data", error);
      } finally {
        setWeatherLoading(false);
      }
    };
    const getLocationAndFetch = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            fetchWeather(position.coords.latitude, position.coords.longitude),
          () => {
            console.error("Geolocation permission denied or error.");
            setWeatherLoading(false);
          },
          { enableHighAccuracy: true }
        );
      } else {
        setWeatherLoading(false);
      }
    };
    const cached = localStorage.getItem("weatherDataHiveDetail");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
        setWeatherData(parsed);
        setWeatherLoading(false);
        return;
      }
    }
    getLocationAndFetch();
  }, []);

  useEffect(() => {
    if (weatherLoading) return;
    const newAlerts: AlertMessage[] = [];
    if (weatherData.temperature !== null) {
      if (weatherData.temperature < 10)
        newAlerts.push({
          id: "temp-low",
          type: "warning",
          message:
            "Low Temperature Detected: Bees may cluster and foraging will stop.",
        });
      else if (weatherData.temperature > 35)
        newAlerts.push({
          id: "temp-high",
          type: "warning",
          message:
            "High Temperature Detected: Risk of hive overheating and absconding.",
        });
    }
    if (weatherData.humidity !== null) {
      if (weatherData.humidity < 30)
        newAlerts.push({
          id: "humidity-low",
          type: "warning",
          message:
            "Low Humidity Detected: The larvae will dehydrate, and the honey will crystallize.",
        });
      else if (weatherData.humidity > 80)
        newAlerts.push({
          id: "humidity-high",
          type: "warning",
          message:
            "High Humidity Detected: High risk of mold and fungal diseases in your hive.",
        });
    }
    if (weatherData.windSpeed !== null && weatherData.windSpeed > 25)
      newAlerts.push({
        id: "wind-high",
        type: "warning",
        message: "High Windspeed Detected: Take care of your hives now.",
      });
    setAlerts(newAlerts);
  }, [weatherData, weatherLoading]);

  const handleCloseAlert = (id: string) => {
    setAlerts((currentAlerts) =>
      currentAlerts.filter((alert) => alert.id !== id)
    );
  };

  const handleDelete = async () => {
    if (!hiveId) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try {
        await axiosInstance.delete(`/bee-hives/delete/${hiveId}`);
        Swal.fire("Deleted!", "The hive has been deleted.", "success");
        router.push(`/platform/${userId}/apiculture/${apiaryId}`);
      } catch (error) {
        Swal.fire("Error", "Failed to delete the hive.", "error");
        console.error("Failed to delete hive:", error);
      }
    }
  };

  const detailItems = useMemo(() => {
    if (!hiveData) return [];
    return [
      {
        label: "Hive Type",
        value: hiveData.hive_type || "N/A",
        icon: faBoxOpen,
      },
      {
        label: "Bee Species",
        value: hiveData.bee_species || "N/A",
        icon: faTag,
      },
      {
        label: "Installation Date",
        value: formattedDate(hiveData.installation_date),
        icon: faCalendarCheck,
      },
      {
        label: "Ventilation",
        value: hiveData.ventilation_status || "N/A",
        icon: faWind,
      },
      {
        label: "Notes",
        value: hiveData.notes || "N/A",
        icon: faStickyNote,
        fullWidth: true,
      },
    ];
  }, [hiveData, currentLanguage]);

  const statusItems = useMemo(() => {
    if (!hiveData) return [];
    return [
      {
        label: "Last Inspection",
        value: formattedDate(hiveData.last_inspection_date),
        icon: faCalendarCheck,
      },
      {
        label: "Queen Status",
        value: hiveData.queen_status || "N/A",
        icon: faCrown,
      },
      {
        label: "Brood Pattern",
        value: hiveData.brood_pattern || "N/A",
        icon: faFlask,
      },
      {
        label: "Pest Infestation",
        value: hiveData.pest_infestation ? "Yes" : "No",
        icon: faBug,
      },
      {
        label: "Disease Detected",
        value: hiveData.disease_detected ? "Yes" : "No",
        icon: faBiohazard,
      },
      {
        label: "Swarm Risk",
        value: hiveData.swarm_risk ? "Yes" : "No",
        icon: faExclamationCircle,
      },
    ];
  }, [hiveData, currentLanguage]);

  const inspectionTableData = useMemo(
    () => ({
      columns: [
        "ID",
        "Date",
        "Queen Status",
        "Pests",
        "Disease",
        "Swarm Risk",
        "Notes",
      ],
      rows: inspections.map((item) => [
        item.inspection_id,
        formattedDate(item.inspection_date),
        item.queen_status || "N/A",
        item.pest_infestation ? "Yes" : "No",
        item.disease_detected ? "Yes" : "No",
        item.swarm_risk ? "Yes" : "No",
        item.notes || "N/A",
      ]),
    }),
    [inspections, currentLanguage]
  );

  const toggleOptions: {
    value: HiveView;
    label: string;
    icon: IconDefinition;
  }[] = [
    { value: "status", label: "Last Inspection", icon: faClipboardList },
    { value: "inspection", label: "Inspection Logs", icon: faHistory },
  ];

  const handleHiveFormSuccess = () => {
    setShowHiveForm(false);
    fetchHiveDetails();
  };

  const handleInspectionSaved = () => {
    setShowInspectionModal(false);
    fetchHiveDetails();
    fetchInspections();
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader />
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Head>
        <title>
          Graminate | {hiveData ? hiveData.hive_name : "Hive Details"}
        </title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 border-l-4 rounded-r-lg flex justify-between items-center ${
              alert.type === "warning"
                ? "bg-yellow-300 border-yellow-200 text-yellow-100 dark:bg-yellow-300/30 dark:border-yellow-200 dark:text-yellow-300"
                : "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
            }`}
            role="alert"
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
              <span className="font-medium">{alert.message}</span>
            </div>
            <button
              onClick={() => handleCloseAlert(alert.id)}
              className={`ml-4 ${
                alert.type === "warning"
                  ? "text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
                  : "text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              }`}
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        ))}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-4 md:mb-0">
            {hiveData ? (
              <>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Hive Details
                </h1>
                <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
                  <span className="font-semibold">Hive Name / Identifier:</span>{" "}
                  {hiveData.hive_name}
                </h2>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-red-200">
                Hive Not Found
              </h1>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              text="Bee Yard"
              arrow="left"
              style="secondary"
              onClick={() =>
                router.push(`/platform/${userId}/apiculture/${apiaryId}`)
              }
            />
            {hiveData && (
              <>
                <Button
                  text="Edit Hive"
                  style="secondary"
                  onClick={() => setShowHiveForm(true)}
                />
                <Button
                  text="Delete Hive"
                  style="delete"
                  onClick={handleDelete}
                />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Hive Information
            </h3>
            {hiveData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {detailItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-start p-2 rounded ${
                      item.fullWidth ? "md:col-span-2" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className="mr-3 mt-1 w-4 h-4 text-blue-200 flex-shrink-0"
                    />
                    <div>
                      <span className="font-semibold block text-gray-700 dark:text-gray-300">
                        {item.label}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ApicultureEnvironmentCard
            loading={weatherLoading}
            temperature={weatherData.temperature}
            humidity={weatherData.humidity}
            precipitation={weatherData.precipitation}
            windSpeed={weatherData.windSpeed}
            windDirection={weatherData.windDirection}
            formatTemperature={formatTemperature}
          />
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <ToggleSwitch
              options={toggleOptions}
              activeOption={activeView}
              onToggle={setActiveView}
            />
            {activeView === "inspection" && (
              <Button
                add
                text=" Inspection"
                style="primary"
                onClick={() => setShowInspectionModal(true)}
              />
            )}
          </div>
          {activeView === "status" &&
            (hiveData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {statusItems.map((item) => (
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
                        {item.label}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-400">
                No status data available.
              </div>
            ))}
          {activeView === "inspection" && (
            <Table
              data={inspectionTableData}
              filteredRows={inspectionTableData.rows}
              currentPage={1}
              setCurrentPage={() => {}}
              itemsPerPage={25}
              setItemsPerPage={() => {}}
              paginationItems={PAGINATION_ITEMS.filter(
                (i) => parseInt(i) <= 10
              )}
              searchQuery=""
              setSearchQuery={() => {}}
              totalRecordCount={inspections.length}
              view="inspections"
              loading={loadingInspections}
              hideChecks={false}
              download={true}
              reset={true}
            />
          )}
        </div>
      </div>

      {showHiveForm && hiveData && apiaryId && (
        <HiveForm
          onClose={() => setShowHiveForm(false)}
          formTitle="Edit Hive Details"
          hiveToEdit={hiveData}
          onHiveUpdateOrAdd={handleHiveFormSuccess}
          apiaryId={parseInt(apiaryId as string, 10)}
        />
      )}
      {showInspectionModal && numericHiveId > 0 && (
        <InspectionModal
          isOpen={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          formTitle="Add New Inspection"
          onInspectionSaved={handleInspectionSaved}
          hiveId={numericHiveId}
        />
      )}
    </PlatformLayout>
  );
};

export default HiveDetailsPage;
