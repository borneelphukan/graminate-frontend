import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";

const CATTLE_TYPES_OPTIONS = ["Cows", "Buffalo", "Goat"];

const CATTLE_PURPOSE_OPTIONS = [
  "Milk Production",
  "Meat Production",
  "Breeding",
  "Ploughing/Transport",
  "Other",
];

export type CattleRearingData = {
  cattle_id?: number;
  user_id: number;
  cattle_name: string;
  cattle_type?: string | null;
  number_of_animals: number;
  purpose?: string | null;
  created_at?: string;
};

interface CattleFormProps extends SidebarProp {
  cattleToEdit?: CattleRearingData | null;
  onCattleUpdateOrAdd?: (updatedOrAddedCattle: CattleRearingData) => void;
}

type CattleFormState = {
  cattle_name: string;
  cattle_type: string;
  number_of_animals: number | string;
  purpose: string;
};

type CattleFormErrors = {
  cattle_name?: string;
  cattle_type?: string;
  number_of_animals?: string;
  purpose?: string;
};

interface CattlePayload {
  user_id: number;
  cattle_name: string;
  number_of_animals: number;
  cattle_type?: string;
  purpose?: string;
}

const CattleForm = ({
  onClose,
  formTitle,
  cattleToEdit,
  onCattleUpdateOrAdd,
}: CattleFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [cattleData, setCattleData] = useState<CattleFormState>({
    cattle_name: "",
    cattle_type: "",
    number_of_animals: "",
    purpose: "",
  });
  const [cattleErrors, setCattleErrors] = useState<CattleFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (cattleToEdit) {
      setCattleData({
        cattle_name: cattleToEdit.cattle_name || "",
        cattle_type: cattleToEdit.cattle_type || "",
        number_of_animals:
          cattleToEdit.number_of_animals != null
            ? String(cattleToEdit.number_of_animals)
            : "",
        purpose: cattleToEdit.purpose || "",
      });
    } else {
      setCattleData({
        cattle_name: "",
        cattle_type: "",
        number_of_animals: "",
        purpose: "",
      });
    }
  }, [cattleToEdit]);

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
    const errors: CattleFormErrors = {};
    let isValid = true;

    if (!cattleData.cattle_name.trim()) {
      errors.cattle_name = "Cattle / Herd Name is required.";
      isValid = false;
    }
    if (
      cattleData.number_of_animals === null ||
      cattleData.number_of_animals === undefined ||
      String(cattleData.number_of_animals).trim() === ""
    ) {
      errors.number_of_animals = "Number of animals is required.";
      isValid = false;
    } else if (isNaN(Number(cattleData.number_of_animals))) {
      errors.number_of_animals = "Number of animals must be a valid number.";
      isValid = false;
    } else if (Number(cattleData.number_of_animals) <= 0) {
      errors.number_of_animals = "Number of animals must be greater than 0.";
      isValid = false;
    }
    setCattleErrors(errors);
    return isValid;
  };

  const handleSubmitCattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!parsedUserId) {
      alert("User ID is missing.");
      return;
    }

    setIsLoading(true);
    const payload: CattlePayload = {
      cattle_name: cattleData.cattle_name,
      number_of_animals: Number(cattleData.number_of_animals),
      user_id: Number(parsedUserId),
    };

    if (cattleData.cattle_type) payload.cattle_type = cattleData.cattle_type;
    if (cattleData.purpose) payload.purpose = cattleData.purpose;

    try {
      let response;
      if (cattleToEdit && cattleToEdit.cattle_id) {
        response = await axiosInstance.put(
          `/cattle-rearing/update/${cattleToEdit.cattle_id}`,
          payload
        );
      } else {
        response = await axiosInstance.post(`/cattle-rearing/add`, payload);
      }

      if (onCattleUpdateOrAdd) {
        onCattleUpdateOrAdd(response.data);
      }
      handleClose();
    } catch (error) {
      console.error("Failed to save cattle data:", error);
      setCattleErrors({
        // Keep existing errors, only add/override general submission error
        cattle_name: "Failed to save. Please try again.",
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
                (cattleToEdit ? "Edit Cattle Record" : "Add New Cattle Record")}
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
              onSubmit={handleSubmitCattle}
              noValidate
            >
              <TextField
                label="Cattle / Herd Name"
                placeholder="e.g. Dairy Herd A, Main Bull"
                value={cattleData.cattle_name}
                onChange={(val: string) => {
                  setCattleData({ ...cattleData, cattle_name: val });
                  setCattleErrors({ ...cattleErrors, cattle_name: undefined });
                }}
                type={cattleErrors.cattle_name ? "error" : ""}
                errorMessage={cattleErrors.cattle_name}
              />
              <TextField
                number
                label="Number of Animals"
                placeholder="e.g. 50"
                value={String(cattleData.number_of_animals)}
                onChange={(val: string) => {
                  setCattleData({
                    ...cattleData,
                    number_of_animals: val, // Keep as string for controlled input, validation handles conversion
                  });
                  setCattleErrors({
                    ...cattleErrors,
                    number_of_animals: undefined,
                  });
                }}
                type={cattleErrors.number_of_animals ? "error" : ""}
                errorMessage={cattleErrors.number_of_animals}
              />
              <DropdownLarge
                label="Cattle Type (Animal)"
                items={CATTLE_TYPES_OPTIONS}
                selectedItem={cattleData.cattle_type}
                onSelect={(val: string) => {
                  setCattleData({ ...cattleData, cattle_type: val });
                }}
                type="form"
                width="full"
              />
              <DropdownLarge
                label="Purpose"
                items={CATTLE_PURPOSE_OPTIONS}
                selectedItem={cattleData.purpose}
                onSelect={(val: string) => {
                  setCattleData({ ...cattleData, purpose: val });
                }}
                type="form"
                width="full"
              />

              <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                <Button
                  text="Cancel"
                  style="secondary"
                  onClick={handleClose}
                  isDisabled={isLoading}
                />
                <Button
                  text={cattleToEdit ? "Update Herd" : "Add Herd"}
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

export default CattleForm;
