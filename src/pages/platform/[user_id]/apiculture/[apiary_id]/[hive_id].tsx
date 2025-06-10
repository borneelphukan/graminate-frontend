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
  faWeightHanging,
  faFlask,
  faCalendarDay,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import HiveForm, { HiveData } from "@/components/form/apiculture/HiveForm";

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

  const [hiveData, setHiveData] = useState<HiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHiveForm, setShowHiveForm] = useState(false);

  const { language: currentLanguage } = useUserPreferences();

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

  useEffect(() => {
    if (router.isReady) {
      fetchHiveDetails();
    }
  }, [router.isReady, fetchHiveDetails]);

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
        label: "Installation Date",
        value: formattedDate(hiveData.installation_date),
        icon: faCalendarCheck,
      },
      {
        label: "Queen Status",
        value: hiveData.queen_status || "N/A",
        icon: faCrown,
      },
      {
        label: "Queen Intro Date",
        value: formattedDate(hiveData.queen_introduced_date),
        icon: faCalendarDay,
      },
      {
        label: "Last Inspection",
        value: formattedDate(hiveData.last_inspection_date),
        icon: faCalendarCheck,
      },
      {
        label: "Brood Pattern",
        value: hiveData.brood_pattern || "N/A",
        icon: faFlask,
      },
      {
        label: "Honey Capacity",
        value: `${hiveData.honey_stores_kg ?? "N/A"} kg`,
        icon: faWeightHanging,
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
        icon: faExclamationTriangle,
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

  const handleFormSuccess = () => {
    setShowHiveForm(false);
    fetchHiveDetails();
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
        <div className="mb-6 mt-2 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              {hiveData ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Hive Details
                  </h1>
                  <h2 className="text-sm font-thin text-dark dark:text-light mt-1">
                    <span className="font-semibold">Hive Name:</span>{" "}
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
          {hiveData && (
            <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {detailItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-start p-2 rounded ${
                      item.fullWidth ? "md:col-span-2 lg:col-span-3" : ""
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
            </div>
          )}
        </div>
      </div>

      {showHiveForm && hiveData && apiaryId && (
        <HiveForm
          onClose={() => setShowHiveForm(false)}
          formTitle="Edit Hive Details"
          hiveToEdit={hiveData}
          onHiveUpdateOrAdd={handleFormSuccess}
          apiaryId={parseInt(apiaryId as string, 10)}
        />
      )}
    </PlatformLayout>
  );
};

export default HiveDetailsPage;
