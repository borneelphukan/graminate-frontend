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
import BeeIcon from "../../../../public/icon/BeeIcon";
import { showToast, toastMessage } from "@/stores/toast";
import TextField from "@/components/ui/TextField";
import PasswordModal from "@/components/modals/PasswordModal";

type ServiceConfig = {
  [key: string]: {
    endpoint: string;
    occupation: string;
  };
};

const SERVICE_CONFIG: ServiceConfig = {
  Fishery: {
    endpoint: "fishery",
    occupation: "Fishery",
  },
  "Cattle Rearing": {
    endpoint: "cattle-rearing",
    occupation: "Cattle Rearing",
  },
  Poultry: {
    endpoint: "flock",
    occupation: "Poultry",
  },
  Apiculture: {
    endpoint: "apiculture",
    occupation: "Apiculture",
  },
};

const AddServicePage = () => {
  const router = useRouter();
  const { user_id } = router.query;

  const { language, subTypes, setUserSubTypes } = useUserPreferences();
  const t = useMemo(() => getTranslator(language), [language]);
  console.log(t);

  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(
    new Set()
  );
  const [servicesToRemove, setServicesToRemove] = useState<Set<string>>(
    new Set()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

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
      try {
        const availableResponse = await axiosInstance.get(
          `/user/${user_id}/available-sub-types`
        );
        const available = availableResponse.data?.data?.subTypes;
        if (!Array.isArray(available)) {
          throw new Error("Available sub-types not found.");
        }
        setAvailableSubTypes(available);
      } catch (err) {
        console.error("Failed to fetch available service data:", err);
        toastMessage.set({
          message: "Failed to load service information. Please try again.",
          type: "error",
        });
        showToast.set(true);
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
    const newSubTypes = [
      ...new Set([...subTypes, ...Array.from(selectedSubTypes)]),
    ];

    try {
      await axiosInstance.put(`/user/${user_id}`, {
        sub_type: newSubTypes,
      });
      toastMessage.set({
        message: "Services added successfully!",
        type: "success",
      });
      showToast.set(true);
      setUserSubTypes(newSubTypes);
      setSelectedSubTypes(new Set());
    } catch (err) {
      console.error("Failed to add user services:", err);
      toastMessage.set({
        message: "Failed to add services. Please try again.",
        type: "error",
      });
      showToast.set(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRemoveServices = async () => {
    if (servicesToRemove.size === 0 || !user_id) return;

    setIsRemoving(true);
    const newSubTypes = subTypes.filter(
      (subType) => !servicesToRemove.has(subType)
    );

    try {
      await axiosInstance.put(`user/${user_id}`, {
        sub_type: newSubTypes,
      });

      const userIdNumber = parseInt(user_id as string, 10);
      const deletionPromises = [];

      for (const service of servicesToRemove) {
        const config = SERVICE_CONFIG[service];
        if (config) {
          deletionPromises.push(
            axiosInstance.post(`${config.endpoint}/reset-service`, {
              userId: userIdNumber,
            })
          );
          deletionPromises.push(
            axiosInstance.post("sales/delete-by-occupation", {
              userId: userIdNumber,
              occupation: config.occupation,
            })
          );
          deletionPromises.push(
            axiosInstance.post("expenses/delete-by-occupation", {
              userId: userIdNumber,
              occupation: config.occupation,
            })
          );
        }
      }

      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
      }

      toastMessage.set({
        message: "Service(s) removed successfully!",
        type: "success",
      });
      showToast.set(true);
      setUserSubTypes(newSubTypes);
      setServicesToRemove(new Set());
    } catch (err) {
      console.error("Failed to remove services or related data:", err);
      toastMessage.set({
        message:
          "Failed to remove services. Some related data may not have been cleared. Please try again.",
        type: "error",
      });
      showToast.set(true);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpenConfirmationModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (servicesToRemove.size > 0) {
      setModalError(null);
      setPassword("");
      setIsModalOpen(true);
    }
  };

  const handleConfirmRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPassword(true);
    setModalError(null);

    try {
      const response = await axiosInstance.post(
        `/user/verify-password/${user_id}`,
        { password }
      );

      if (response.data.valid) {
        setIsModalOpen(false);
        setPassword("");
        await executeRemoveServices();
      } else {
        setModalError("Incorrect password. Please try again.");
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      setModalError("Failed to verify password. Please check and try again.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const servicesToShow = availableSubTypes.filter(
    (subType) => !subTypes.includes(subType)
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
      <PasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleConfirmRemoval}
        title="Confirm Password"
        footerContent={
          <>
            <Button
              type="button"
              style="secondary"
              onClick={() => setIsModalOpen(false)}
              text="Cancel"
              isDisabled={isVerifyingPassword}
            />
            <Button
              type="submit"
              style="delete"
              text={isVerifyingPassword ? "Verifying..." : "Remove Service"}
              isDisabled={isVerifyingPassword || !password}
            />
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Enter password to remove selected service(s) and all related data.
        </p>
        <TextField
          placeholder="Enter your password"
          password={true}
          value={password}
          onChange={setPassword}
          width="large"
          type={modalError ? "error" : ""}
          errorMessage={modalError || ""}
          isDisabled={isVerifyingPassword}
        />
      </PasswordModal>

      <div className="p-4 sm:p-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-dark dark:text-light">
            Manage Your Services
          </h1>
          <p className="text-dark dark:text-light">
            Add or remove services based on your agricultural needs.
          </p>
        </header>
        <hr className="mb-6 border-gray-400 dark:border-gray-700" />

        {servicesToShow.length > 0 ? (
          <form onSubmit={handleAddSubmit}>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Add Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

        {subTypes.length > 0 && (
          <>
            <hr className="my-10 border-gray-300 dark:border-gray-600" />
            <form onSubmit={handleOpenConfirmationModal}>
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Current Services
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {subTypes.map((subType) => (
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
