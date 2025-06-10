import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";

export type ApicultureData = {
  apiary_id?: number;
  user_id: number;
  apiary_name: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  area?: number | null;
  created_at?: string;
};

interface ApicultureFormProps extends SidebarProp {
  apiaryToEdit?: ApicultureData | null;
  onApiaryUpdateOrAdd?: (updatedOrAddedApiary: ApicultureData) => void;
}

type ApiaryFormState = {
  apiary_name: string;
  area: number | string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
};

type ApiaryFormErrors = {
  apiary_name?: string;
  area?: string;
};

type ApiaryPayload = {
  user_id: number;
  apiary_name: string;
  area?: number;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

const ApicultureForm = ({
  onClose,
  formTitle,
  apiaryToEdit,
  onApiaryUpdateOrAdd,
}: ApicultureFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [apiaryData, setApiaryData] = useState<ApiaryFormState>({
    apiary_name: "",
    area: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [apiaryErrors, setApiaryErrors] = useState<ApiaryFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (apiaryToEdit) {
      setApiaryData({
        apiary_name: apiaryToEdit.apiary_name || "",
        area: apiaryToEdit.area != null ? String(apiaryToEdit.area) : "",
        address_line_1: apiaryToEdit.address_line_1 || "",
        address_line_2: apiaryToEdit.address_line_2 || "",
        city: apiaryToEdit.city || "",
        state: apiaryToEdit.state || "",
        postal_code: apiaryToEdit.postal_code || "",
      });
    } else {
      setApiaryData({
        apiary_name: "",
        area: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        postal_code: "",
      });
    }
  }, [apiaryToEdit]);

  const handleCloseAnimation = useCallback(() => {
    setAnimate(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleClose = useCallback(() => {
    handleCloseAnimation();
  }, [handleCloseAnimation]);

  useClickOutside(panelRef, handleClose);

  const validateForm = (): boolean => {
    const errors: ApiaryFormErrors = {};
    let isValid = true;

    if (!apiaryData.apiary_name.trim()) {
      errors.apiary_name = "Bee Yard Name/Identifier is required.";
      isValid = false;
    }

    if (
      String(apiaryData.area).trim() !== "" &&
      isNaN(Number(apiaryData.area))
    ) {
      errors.area = "Area must be a valid number.";
      isValid = false;
    } else if (Number(apiaryData.area) < 0) {
      errors.area = "Area cannot be negative.";
      isValid = false;
    }

    setApiaryErrors(errors);
    return isValid;
  };

  const handleSubmitApiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!parsedUserId) {
      alert("User ID is missing.");
      return;
    }

    setIsLoading(true);
    const payload: ApiaryPayload = {
      apiary_name: apiaryData.apiary_name,
      user_id: Number(parsedUserId),
    };

    if (String(apiaryData.area).trim() !== "") {
      payload.area = Number(apiaryData.area);
    }
    if (apiaryData.address_line_1)
      payload.address_line_1 = apiaryData.address_line_1;
    if (apiaryData.address_line_2)
      payload.address_line_2 = apiaryData.address_line_2;
    if (apiaryData.city) payload.city = apiaryData.city;
    if (apiaryData.state) payload.state = apiaryData.state;
    if (apiaryData.postal_code) payload.postal_code = apiaryData.postal_code;

    try {
      let response;
      if (apiaryToEdit && apiaryToEdit.apiary_id) {
        response = await axiosInstance.put(
          `/apiculture/update/${apiaryToEdit.apiary_id}`,
          payload
        );
      } else {
        response = await axiosInstance.post(`/apiculture/add`, payload);
      }

      if (onApiaryUpdateOrAdd) {
        onApiaryUpdateOrAdd(response.data);
      }
      handleClose();
    } catch (error) {
      console.error("Failed to save apiary data:", error);
      setApiaryErrors({
        apiary_name: "Failed to save. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-light dark:bg-gray-800 shadow-lg dark:border-l border-gray-700 overflow-y-auto"
        style={{
          transform: animate ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-500 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-dark dark:text-light">
              {formTitle ||
                (apiaryToEdit ? "Edit Bee Yard" : "Add New Bee Yard")}
            </h2>
            <button
              className="text-gray-400 hover:text-dark dark:text-light dark:hover:text-gray-300 transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={handleSubmitApiary}
              noValidate
            >
              <TextField
                label="Bee Yard"
                placeholder="e.g. Main Field Bee Yard"
                value={apiaryData.apiary_name}
                onChange={(val: string) => {
                  setApiaryData({ ...apiaryData, apiary_name: val });
                  setApiaryErrors({ ...apiaryErrors, apiary_name: undefined });
                }}
                type={apiaryErrors.apiary_name ? "error" : ""}
                errorMessage={apiaryErrors.apiary_name}
              />

              <TextField
                label="Address Line 1 (Optional)"
                placeholder="e.g. 123 Bee Lane"
                value={apiaryData.address_line_1}
                onChange={(val: string) => {
                  setApiaryData({ ...apiaryData, address_line_1: val });
                }}
              />
              <TextField
                label="Address Line 2 (Optional)"
                placeholder="e.g. Apt/Suite 4B"
                value={apiaryData.address_line_2}
                onChange={(val: string) => {
                  setApiaryData({ ...apiaryData, address_line_2: val });
                }}
              />
              <TextField
                label="City (Optional)"
                placeholder="e.g. Honeyville"
                value={apiaryData.city}
                onChange={(val: string) => {
                  setApiaryData({ ...apiaryData, city: val });
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="State / Province (Optional)"
                  placeholder="e.g. Beeshire"
                  value={apiaryData.state}
                  onChange={(val: string) => {
                    setApiaryData({ ...apiaryData, state: val });
                  }}
                />
                <TextField
                  label="Postal Code (Optional)"
                  placeholder="e.g. 12345"
                  value={apiaryData.postal_code}
                  onChange={(val: string) => {
                    setApiaryData({ ...apiaryData, postal_code: val });
                  }}
                />
              </div>
              <TextField
                number
                label="Area (Optional, in sq. meters)"
                placeholder="e.g. 150.5"
                value={String(apiaryData.area)}
                onChange={(val: string) => {
                  setApiaryData({ ...apiaryData, area: val });
                  setApiaryErrors({ ...apiaryErrors, area: undefined });
                }}
                type={apiaryErrors.area ? "error" : ""}
                errorMessage={apiaryErrors.area}
              />
              <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                <Button
                  text="Cancel"
                  style="secondary"
                  onClick={handleClose}
                  isDisabled={isLoading}
                />
                <Button
                  text={apiaryToEdit ? "Update Bee Yard" : "Add Bee Yard"}
                  style="primary"
                  type="submit"
                  isDisabled={isLoading}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApicultureForm;
