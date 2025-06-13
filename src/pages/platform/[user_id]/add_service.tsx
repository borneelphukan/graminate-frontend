import React, { useState, useEffect, useMemo, JSX } from "react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator } from "@/translations";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCow, faFish, faKiwiBird } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";

const BeeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 297 297"
    className="w-full h-full"
    fill="currentColor"
  >
    <path
      d="M262.223,87.121c-21.74-21.739-48.581-34.722-71.809-34.735c-0.373-4.733-1.523-9.251-3.337-13.418
      c0.21-0.178,0.419-0.359,0.617-0.558l16.139-16.139c3.82-3.82,3.82-10.013,0-13.833c-3.821-3.819-10.012-3.819-13.833,0
      l-14.795,14.795c-7.268-5.989-16.574-9.59-26.705-9.59c-10.131,0-19.436,3.601-26.705,9.59L107,8.439
      c-3.821-3.819-10.012-3.819-13.833,0c-3.82,3.82-3.82,10.013,0,13.833l16.139,16.139c0.198,0.198,0.407,0.38,0.617,0.558
      c-1.815,4.167-2.964,8.685-3.337,13.418c-23.228,0.013-50.069,12.996-71.809,34.735c-35.581,35.582-45.379,81.531-22.303,104.607
      c8.133,8.132,19.463,12.431,32.765,12.431c14.327,0,30.03-4.943,45.064-13.827v13.308c0,28.756,20.969,52.692,48.416,57.359v20.645
      c0,5.402,4.379,9.781,9.781,9.781c5.402,0,9.781-4.379,9.781-9.781v-20.645c27.447-4.667,48.416-28.603,48.416-57.359v-13.308
      c15.034,8.884,30.737,13.827,45.064,13.827c0.001,0,0.001,0,0.002,0c13.3,0,24.629-4.298,32.763-12.431
      C307.601,168.652,297.804,122.703,262.223,87.121z M148.5,78.187c-2.054-4.99-5.252-9.506-9.115-13.37
      c-3.799-3.798-8.302-6.748-13.37-8.827c-0.001-0.097-0.011-0.191-0.011-0.288c0-12.405,10.091-22.496,22.496-22.496
      c12.405,0,22.496,10.091,22.496,22.496c0,0.097-0.01,0.192-0.011,0.289c-5.068,2.078-9.571,5.029-13.37,8.827
      C153.752,68.681,150.554,73.197,148.5,78.187 M148.5,119.137c2.248,7.509,5.611,15.18,10.032,22.768
      c-3.225,0.547-6.591,0.848-10.032,0.848c-3.441,0-6.806-0.301-10.032-0.848C142.889,134.318,146.252,126.646,148.5,119.137z
      M26.307,177.895c-14.808-14.809-4.594-50.044,22.303-76.942c17.891-17.891,40.119-29.006,58.01-29.006
      c8.115,0,14.484,2.255,18.932,6.702c14.808,14.809,4.594,50.044-22.303,76.942c-17.891,17.891-40.119,29.005-58.01,29.005
      C37.123,184.597,30.754,182.343,26.307,177.895z M187.135,203.64c0,21.303-17.332,38.635-38.635,38.635
      c-21.303,0-38.635-17.332-38.635-38.635v-3.279c10.207,6.479,23.673,10.37,38.635,10.37c14.962,0,28.428-3.891,38.635-10.37V203.64z
      M148.5,191.17c-16.991,0-32.249-7.167-37.059-16.41c1.912-1.715,3.796-3.491,5.64-5.335c3.31-3.311,6.396-6.711,9.254-10.174
      c6.801,1.975,14.272,3.065,22.164,3.065c7.893,0,15.367-1.086,22.168-3.061c2.857,3.462,5.942,6.861,9.251,10.17
      c1.844,1.844,3.728,3.62,5.64,5.335C180.749,184.002,165.491,191.17,148.5,191.17z M270.693,177.895
      c-4.447,4.447-10.816,6.703-18.931,6.702c-17.892,0-40.12-11.114-58.011-29.005c-26.898-26.898-37.112-62.133-22.303-76.942
      c4.447-4.447,10.816-6.702,18.932-6.702c17.891,0,40.119,11.114,58.01,29.006C275.288,127.852,285.501,163.086,270.693,177.895z"
    />
  </svg>
);

const AddServicePage = () => {
  const router = useRouter();
  const { user_id } = router.query;

  const { language } = useUserPreferences();
  const t = useMemo(() => getTranslator(language), [language]);

  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [currentUserSubTypes, setCurrentUserSubTypes] = useState<string[]>([]);

  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(
    new Set()
  );
  const [servicesToRemove, setServicesToRemove] = useState<Set<string>>(
    new Set()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const AgricultureIcons: Record<string, JSX.Element> = {
    Fishery: <FontAwesomeIcon icon={faFish} />,
    Poultry: <FontAwesomeIcon icon={faKiwiBird} />,
    "Cattle Rearing": <FontAwesomeIcon icon={faCow} />,
    Apiculture: <BeeIcon />,
  };

  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userResponse, availableResponse] = await Promise.all([
          axiosInstance.get(`/user/${user_id}`),
          axiosInstance.get(`/user/${user_id}/available-sub-types`),
        ]);

        const user = userResponse.data?.data?.user ?? userResponse.data?.user;
        if (!user) throw new Error("User data not found.");
        setCurrentUserSubTypes(
          Array.isArray(user.sub_type) ? user.sub_type : []
        );

        const available = availableResponse.data?.data?.subTypes;
        if (!Array.isArray(available))
          throw new Error("Available sub-types not found.");
        setAvailableSubTypes(available);
      } catch (err) {
        console.error("Failed to fetch service data:", err);
        setError("Failed to load service information. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user_id]);

  const handleAddCheckboxChange = (subType: string) => {
    setSelectedSubTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subType)) {
        newSet.delete(subType);
      } else {
        newSet.add(subType);
      }
      return newSet;
    });
  };

  const handleRemoveCheckboxChange = (subType: string) => {
    setServicesToRemove((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subType)) {
        newSet.delete(subType);
      } else {
        newSet.add(subType);
      }
      return newSet;
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubTypes.size === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const newSubTypes = [
      ...new Set([...currentUserSubTypes, ...Array.from(selectedSubTypes)]),
    ];

    try {
      await axiosInstance.put(`/user/${user_id}`, {
        sub_type: newSubTypes,
      });
      setSuccessMessage("Services added successfully!");
      setCurrentUserSubTypes(newSubTypes);
      setSelectedSubTypes(new Set());
    } catch (err) {
      console.error("Failed to add user services:", err);
      setError("Failed to add services. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (servicesToRemove.size === 0) return;

    setIsRemoving(true);
    setError(null);
    setSuccessMessage(null);

    const newSubTypes = currentUserSubTypes.filter(
      (subType) => !servicesToRemove.has(subType)
    );

    try {
      await axiosInstance.put(`/user/${user_id}`, {
        sub_type: newSubTypes,
      });

      const userIdNumber = parseInt(user_id as string, 10);
      const deletionPromises = [];

      if (servicesToRemove.has("Fishery")) {
        deletionPromises.push(
          axiosInstance.post("fishery/reset-service", {
            userId: userIdNumber,
          })
        );
        deletionPromises.push(
          axiosInstance.post("sales/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Fishery",
          })
        );
        deletionPromises.push(
          axiosInstance.post("expenses/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Fishery",
          })
        );
      }

      if (servicesToRemove.has("Cattle Rearing")) {
        deletionPromises.push(
          axiosInstance.post("cattle-rearing/reset-service", {
            userId: userIdNumber,
          })
        );
        deletionPromises.push(
          axiosInstance.post("sales/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Cattle Rearing",
          })
        );
        deletionPromises.push(
          axiosInstance.post("expenses/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Cattle Rearing",
          })
        );
      }

      if (servicesToRemove.has("Poultry")) {
        deletionPromises.push(
          axiosInstance.post("flock/reset-service", {
            userId: userIdNumber,
          })
        );
        deletionPromises.push(
          axiosInstance.post("sales/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Poultry",
          })
        );
        deletionPromises.push(
          axiosInstance.post("expenses/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Poultry",
          })
        );
      }

      if (servicesToRemove.has("Apiculture")) {
        deletionPromises.push(
          axiosInstance.post("apiculture/reset-service", {
            userId: userIdNumber,
          })
        );
        deletionPromises.push(
          axiosInstance.post("sales/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Apiculture",
          })
        );
        deletionPromises.push(
          axiosInstance.post("expenses/delete-by-occupation", {
            userId: userIdNumber,
            occupation: "Apiculture",
          })
        );
      }

      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
      }

      setSuccessMessage("Service(s) removed successfully!");
      setCurrentUserSubTypes(newSubTypes);
      setServicesToRemove(new Set());
    } catch (err) {
      console.error("Failed to remove user services:", err);
      setError("Failed to remove services. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const servicesToShow = availableSubTypes.filter(
    (subType) => !currentUserSubTypes.includes(subType)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Add Service</title>
      </Head>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">{"Manage Your Services"}</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-300 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-lg">
            {successMessage}
          </div>
        )}

        {servicesToShow.length > 0 ? (
          <form onSubmit={handleAddSubmit}>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                {"Available Services"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {servicesToShow.map((subType) => (
                  <label
                    key={subType}
                    htmlFor={`add-subtype-${subType}`}
                    className={`flex flex-col items-center justify-center text-center p-4 border rounded-xl cursor-pointer 
                                   transition-all duration-200 ease-in-out group
                                   hover:border-green-200 dark:hover:border-green-100
                                   ${
                                     selectedSubTypes.has(subType)
                                       ? "bg-green-400 dark:bg-green-100/30 border-green-200 dark:border-green-100 shadow-lg"
                                       : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-light dark:hover:bg-gray-600/50"
                                   }`}
                  >
                    <input
                      type="checkbox"
                      id={`add-subtype-${subType}`}
                      name="addSubType"
                      value={subType}
                      checked={selectedSubTypes.has(subType)}
                      onChange={() => handleAddCheckboxChange(subType)}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-10 h-10 mb-3 flex items-center justify-center text-3xl
                                      transition-colors duration-200 
                                      ${
                                        selectedSubTypes.has(subType)
                                          ? "text-green-100 dark:text-green-300"
                                          : "text-gray-400 dark:text-gray-300 group-hover:text-green-200 dark:group-hover:text-green-200 peer-focus:text-green-200 dark:peer-focus:text-green-200"
                                      }`}
                    >
                      {AgricultureIcons[subType]}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-200 ${
                        selectedSubTypes.has(subType)
                          ? "text-green-100 dark:text-green-300"
                          : "text-dark dark:text-light group-hover:text-green-200 dark:group-hover:text-green-200 peer-focus:text-green-100 dark:peer-focus:text-green-200"
                      }`}
                    >
                      {subType}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                style="primary"
                isDisabled={isSubmitting || selectedSubTypes.size === 0}
                text={isSubmitting ? "Adding..." : "Add Selected Services"}
              />
            </div>
          </form>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              {"Available Services"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {"You have subscribed to all available services."}
            </p>
          </div>
        )}

        {currentUserSubTypes.length > 0 && (
          <>
            <hr className="my-10 border-gray-300 dark:border-gray-600" />
            <form onSubmit={handleRemoveSubmit}>
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  {"Your Current Services"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentUserSubTypes.map((subType) => (
                    <label
                      key={subType}
                      htmlFor={`remove-subtype-${subType}`}
                      className={`flex flex-col items-center justify-center text-center p-4 border rounded-xl cursor-pointer 
                                    transition-all duration-200 ease-in-out group
                                    hover:border-red-500 dark:hover:border-red-400
                                    ${
                                      servicesToRemove.has(subType)
                                        ? "bg-red-400 dark:bg-red-900/50 border-red-200 dark:border-red-200 shadow-lg"
                                        : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-light dark:hover:bg-gray-600/50"
                                    }`}
                    >
                      <input
                        type="checkbox"
                        id={`remove-subtype-${subType}`}
                        name="removeSubType"
                        value={subType}
                        checked={servicesToRemove.has(subType)}
                        onChange={() => handleRemoveCheckboxChange(subType)}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-10 h-10 mb-3 flex items-center justify-center text-3xl
                                       transition-colors duration-200 
                                       ${
                                         servicesToRemove.has(subType)
                                           ? "text-red-100 dark:text-red-300"
                                           : "text-gray-400 dark:text-gray-300 group-hover:text-red-500 dark:group-hover:text-red-400 peer-focus:text-red-500 dark:peer-focus:text-red-400"
                                       }`}
                      >
                        {AgricultureIcons[subType]}
                      </div>
                      <span
                        className={`text-sm font-medium transition-colors duration-200 ${
                          servicesToRemove.has(subType)
                            ? "text-red-100 dark:text-red-300"
                            : "text-gray-800 dark:text-gray-200 group-hover:text-red-500 dark:group-hover:text-red-400 peer-focus:text-red-100 dark:peer-focus:text-red-400"
                        }`}
                      >
                        {subType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  type="submit"
                  style="delete"
                  isDisabled={isRemoving || servicesToRemove.size === 0}
                  text={isRemoving ? "Removing..." : "Remove Selected Services"}
                />
              </div>
            </form>
          </>
        )}
      </div>
    </PlatformLayout>
  );
};

export default AddServicePage;
