import React, { useState, useEffect } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import InfoModal from "../InfoModal";


type EggModalProps = {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  flockId: number;
  userId: number;
  eggRecordToEdit?: EggRecord | null;
  onRecordSaved: () => void;
};

type EggRecord = {
  egg_id?: number;
  date_collected: string;
  small_eggs: number;
  medium_eggs: number;
  large_eggs: number;
  extra_large_eggs: number;
  broken_eggs: number;
};

const EggModal = ({
  isOpen,
  onClose,
  formTitle,
  flockId,
  userId,
  eggRecordToEdit,
  onRecordSaved,
}: EggModalProps) => {
  const [dateCollected, setDateCollected] = useState("");
  const [smallEggs, setSmallEggs] = useState<number | string>("");
  const [mediumEggs, setMediumEggs] = useState<number | string>("");
  const [largeEggs, setLargeEggs] = useState<number | string>("");
  const [extraLargeEggs, setExtraLargeEggs] = useState<number | string>("");
  const [brokenEggs, setBrokenEggs] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EggRecord, string>>
  >({});

  const [infoModalState, setInfoModalState] = useState<{
    isOpen: boolean;
    title: string;
    text: string;
    variant?: "success" | "error" | "info" | "warning";
  }>({
    isOpen: false,
    title: "",
    text: "",
    variant: undefined,
  });

  const resetForm = () => {
    setDateCollected(new Date().toISOString().split("T")[0]);
    setSmallEggs("");
    setMediumEggs("");
    setLargeEggs("");
    setExtraLargeEggs("");
    setBrokenEggs("");
    setErrors({});
  };

  useEffect(() => {
    if (isOpen) {
      if (eggRecordToEdit) {
        setDateCollected(
          eggRecordToEdit.date_collected
            ? new Date(eggRecordToEdit.date_collected)
                .toISOString()
                .split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setSmallEggs(eggRecordToEdit.small_eggs?.toString() ?? "");
        setMediumEggs(eggRecordToEdit.medium_eggs?.toString() ?? "");
        setLargeEggs(eggRecordToEdit.large_eggs?.toString() ?? "");
        setExtraLargeEggs(eggRecordToEdit.extra_large_eggs?.toString() ?? "");
        setBrokenEggs(eggRecordToEdit.broken_eggs?.toString() ?? "");
      } else {
        resetForm();
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [eggRecordToEdit, isOpen]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof EggRecord, string>> = {};
    if (!dateCollected) newErrors.date_collected = "Date is required";

    const checkNonNegativeInteger = (
      value: number | string,
      fieldName: keyof EggRecord
    ) => {
      const num = Number(value);
      if (value !== "" && (isNaN(num) || num < 0 || !Number.isInteger(num))) {
        newErrors[fieldName] = "Must be a non-negative whole number";
      }
    };

    checkNonNegativeInteger(smallEggs, "small_eggs");
    checkNonNegativeInteger(mediumEggs, "medium_eggs");
    checkNonNegativeInteger(largeEggs, "large_eggs");
    checkNonNegativeInteger(extraLargeEggs, "extra_large_eggs");
    checkNonNegativeInteger(brokenEggs, "broken_eggs");

    const sE = Number(smallEggs) || 0;
    const mE = Number(mediumEggs) || 0;
    const lE = Number(largeEggs) || 0;
    const xlE = Number(extraLargeEggs) || 0;

    if (sE === 0 && mE === 0 && lE === 0 && xlE === 0) {
      newErrors.small_eggs =
        "At least one egg size (Small, Medium, Large, or Extra Large) quantity is required and must be > 0 if others are 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const payload = {
      user_id: userId,
      flock_id: flockId,
      date_collected: dateCollected,
      small_eggs: Number(smallEggs) || 0,
      medium_eggs: Number(mediumEggs) || 0,
      large_eggs: Number(largeEggs) || 0,
      extra_large_eggs: Number(extraLargeEggs) || 0,
      broken_eggs: Number(brokenEggs) || 0,
    };

    try {
      if (eggRecordToEdit && eggRecordToEdit.egg_id) {
        await axiosInstance.put(
          `/poultry-eggs/update/${eggRecordToEdit.egg_id}`,
          payload
        );
      } else {
        await axiosInstance.post("/poultry-eggs/add", payload);
      }
      onRecordSaved();
      onClose();
    } catch (error: any) {
      console.error("Error saving egg record:", error);
      setInfoModalState({
        isOpen: true,
        title: "Error",
        text: error.response?.data?.message || "Failed to save egg record.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-400 dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {formTitle}
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              label="Date Collected"
              calendar
              value={dateCollected}
              onChange={(val) => setDateCollected(val)}
              errorMessage={errors.date_collected}
              type={errors.date_collected ? "error" : ""}
              width="large"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="Small Eggs"
                number
                placeholder="e.g., 10"
                value={smallEggs === 0 ? "" : String(smallEggs)}
                onChange={(val) => setSmallEggs(val)}
                type={errors.small_eggs ? "error" : ""}
                width="large"
              />
              <TextField
                label="Medium Eggs"
                number
                placeholder="e.g., 20"
                value={mediumEggs === 0 ? "" : String(mediumEggs)}
                onChange={(val) => setMediumEggs(val)}
                type={errors.medium_eggs ? "error" : ""}
                width="large"
              />
              <TextField
                label="Large Eggs"
                number
                placeholder="e.g., 15"
                value={largeEggs === 0 ? "" : String(largeEggs)}
                onChange={(val) => setLargeEggs(val)}
                type={errors.large_eggs ? "error" : ""}
                width="large"
              />
              <TextField
                label="Extra Large Eggs"
                number
                placeholder="e.g., 5"
                value={extraLargeEggs === 0 ? "" : String(extraLargeEggs)}
                onChange={(val) => setExtraLargeEggs(val)}
                type={errors.extra_large_eggs ? "error" : ""}
                width="large"
              />
            </div>
            <TextField
              label="Broken Eggs"
              number
              placeholder="e.g., 2"
              value={brokenEggs === 0 ? "" : String(brokenEggs)}
              onChange={(val) => setBrokenEggs(val)}
              type={errors.broken_eggs ? "error" : ""}
              width="large"
            />

            <div className="flex justify-end gap-4 pt-6 mt-8 border-t border-gray-400 dark:border-gray-600">
              <Button
                text="Cancel"
                type="button"
                style="secondary"
                onClick={onClose}
                isDisabled={isSubmitting}
              />
              <Button
                text={
                  isSubmitting
                    ? "Saving..."
                    : eggRecordToEdit
                    ? "Update Record"
                    : "Add Record"
                }
                type="submit"
                style="primary"
                isDisabled={isSubmitting}
              />
            </div>
          </form>
        </div>
      </div>
      <InfoModal
        isOpen={infoModalState.isOpen}
        onClose={() =>
          setInfoModalState((prev) => ({ ...prev, isOpen: false }))
        }
        title={infoModalState.title}
        text={infoModalState.text}
        variant={infoModalState.variant}
      />
    </>
  );
};

export default EggModal;
