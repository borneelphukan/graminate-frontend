import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FISHERY_TYPES, FEED_TYPES } from "@/constants/options";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import TextArea from "../ui/TextArea";

interface FisheryApiData {
  fishery_id?: number;
  user_id: number;
  fishery_type: string;
  target_species: string;
  feed_type: string;
  notes?: string;
  created_at?: string;
}

interface FisheryFormProps extends SidebarProp {
  fisheryToEdit?: FisheryApiData | null;
  onFisheryUpdateOrAdd?: (updatedOrAddedFishery: FisheryApiData) => void;
}

type FisheryFormState = {
  fishery_type: string;
  target_species: string;
  feed_type: string;
  notes: string;
};

type FisheryFormErrors = {
  fishery_type?: string;
  target_species?: string;
  feed_type?: string;
  notes?: string;
};

const FisheryForm = ({
  onClose,
  formTitle,
  fisheryToEdit,
  onFisheryUpdateOrAdd,
}: FisheryFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [fisheryData, setFisheryData] = useState<FisheryFormState>({
    fishery_type: "",
    target_species: "",
    feed_type: "",
    notes: "",
  });
  const [fisheryErrors, setFisheryErrors] = useState<FisheryFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (fisheryToEdit) {
      setFisheryData({
        fishery_type: fisheryToEdit.fishery_type || "",
        target_species: fisheryToEdit.target_species || "",
        feed_type: fisheryToEdit.feed_type || "",
        notes: fisheryToEdit.notes || "",
      });
    } else {
      setFisheryData({
        fishery_type: "",
        target_species: "",
        feed_type: "",
        notes: "",
      });
    }
  }, [fisheryToEdit]);

  const handleCloseAnimation = () => {
    setAnimate(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClose = () => {
    handleCloseAnimation();
  };

  useClickOutside(panelRef, handleClose);

  const validateForm = (): boolean => {
    const errors: FisheryFormErrors = {};
    let isValid = true;

    if (!fisheryData.fishery_type) {
      errors.fishery_type = "Fishery Type is required.";
      isValid = false;
    }
    if (!fisheryData.target_species.trim()) {
      errors.target_species = "Target Species is required.";
      isValid = false;
    }
    if (!fisheryData.feed_type) {
      errors.feed_type = "Feed Type is required.";
      isValid = false;
    }

    setFisheryErrors(errors);
    return isValid;
  };

  const handleSubmitFishery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!parsedUserId) {
      alert("User ID is missing.");
      return;
    }

    setIsLoading(true);
    const payload: any = {
      user_id: Number(parsedUserId),
      fishery_type: fisheryData.fishery_type,
      target_species: fisheryData.target_species,
      feed_type: fisheryData.feed_type,
    };

    if (fisheryData.notes.trim()) payload.notes = fisheryData.notes;

    try {
      let response;
      if (fisheryToEdit && fisheryToEdit.fishery_id) {
        response = await axiosInstance.put(
          `/fishery/update/${fisheryToEdit.fishery_id}`,
          payload
        );
      } else {
        response = await axiosInstance.post(`/fishery/add`, payload);
      }

      if (onFisheryUpdateOrAdd) {
        onFisheryUpdateOrAdd(response.data);
      }

      handleClose();
    } catch (error: unknown) {
      alert(`Error updating or adding`);
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
                (fisheryToEdit ? "Edit Fishery Details" : "Add New Fishery")}
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={handleSubmitFishery}
              noValidate
            >
              <DropdownLarge
                label="Fishery Type"
                items={FISHERY_TYPES}
                selectedItem={fisheryData.fishery_type}
                onSelect={(val: string) => {
                  setFisheryData({ ...fisheryData, fishery_type: val });
                  setFisheryErrors({
                    ...fisheryErrors,
                    fishery_type: undefined,
                  });
                }}
                type="form"
                width="full"
              />
              {fisheryErrors.fishery_type && (
                <p className="text-xs text-red-500 -mt-2 ml-1">
                  {fisheryErrors.fishery_type}
                </p>
              )}

              <TextField
                label="Target Species"
                placeholder="e.g. Tilapia, Salmon, Shrimp"
                value={fisheryData.target_species}
                onChange={(val: string) => {
                  setFisheryData({ ...fisheryData, target_species: val });
                  setFisheryErrors({
                    ...fisheryErrors,
                    target_species: undefined,
                  });
                }}
                type={fisheryErrors.target_species ? "error" : ""}
                errorMessage={fisheryErrors.target_species}
              />

              <DropdownLarge
                label="Feed Type"
                items={FEED_TYPES}
                selectedItem={fisheryData.feed_type}
                onSelect={(val: string) => {
                  setFisheryData({ ...fisheryData, feed_type: val });
                  setFisheryErrors({ ...fisheryErrors, feed_type: undefined });
                }}
                type="form"
                width="full"
              />
              {fisheryErrors.feed_type && (
                <p className="text-xs text-red-500 -mt-2 ml-1">
                  {fisheryErrors.feed_type}
                </p>
              )}

              <TextArea
                label="Notes (Optional)"
                placeholder="e.g. Water quality parameters, growth observations"
                value={fisheryData.notes}
                onChange={(val: string) => {
                  setFisheryData({ ...fisheryData, notes: val });
                }}
              />

              <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-500 dark:border-gray-700">
                <Button
                  text="Cancel"
                  style="secondary"
                  onClick={handleClose}
                  isDisabled={isLoading}
                />
                <Button
                  text={fisheryToEdit ? "Update Fishery" : "Create Fishery"}
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

export default FisheryForm;
