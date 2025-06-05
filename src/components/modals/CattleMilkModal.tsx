// components/modals/CattleMilkModal.tsx
import React, { useState, useEffect } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import InfoModal from "./InfoModal";
import { format, isValid as isValidDate } from "date-fns";

type CattleMilkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  userId: number;
  initialCattleId?: number;
  allUserCattle: { cattle_id: number; cattle_name: string }[];
  milkRecordToEdit?: MilkRecord | null;
  onRecordSaved: () => void;
};

export type MilkRecord = {
  milk_id?: number;
  cattle_id: number;
  date_collected: string;
  animal_name?: string | null;
  milk_produced: number;
};

const CattleMilkModal = ({
  isOpen,
  onClose,
  formTitle,
  userId,
  initialCattleId,
  allUserCattle,
  milkRecordToEdit,
  onRecordSaved,
}: CattleMilkModalProps) => {
  const [selectedCattleId, setSelectedCattleId] = useState<number | undefined>(
    initialCattleId
  );
  const [dateCollected, setDateCollected] = useState<string>("");
  const [animalName, setAnimalName] = useState<string>("");
  const [milkProduced, setMilkProduced] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof Omit<MilkRecord, "milk_id" | "user_id">, string>> & {
      selectedCattleId?: string;
    }
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
    setSelectedCattleId(
      initialCattleId ||
        (allUserCattle.length > 0 ? allUserCattle[0].cattle_id : undefined)
    );
    setDateCollected(format(new Date(), "yyyy-MM-dd"));
    setAnimalName("");
    setMilkProduced("");
    setErrors({});
  };

  useEffect(() => {
    if (isOpen) {
      if (milkRecordToEdit) {
        setSelectedCattleId(milkRecordToEdit.cattle_id);
        setDateCollected(
          milkRecordToEdit.date_collected &&
            isValidDate(new Date(milkRecordToEdit.date_collected))
            ? format(new Date(milkRecordToEdit.date_collected), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd")
        );
        setAnimalName(milkRecordToEdit.animal_name || "");
        setMilkProduced(milkRecordToEdit.milk_produced?.toString() ?? "");
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
  }, [milkRecordToEdit, isOpen, initialCattleId, allUserCattle]);

  const validateForm = () => {
    const newErrors: Partial<
      Record<keyof Omit<MilkRecord, "milk_id" | "user_id">, string>
    > & { selectedCattleId?: string } = {};
    if (!selectedCattleId)
      newErrors.selectedCattleId = "Cattle selection is required";
    if (!dateCollected) newErrors.date_collected = "Date is required";
    else if (!isValidDate(new Date(dateCollected)))
      newErrors.date_collected = "Invalid date format";

    const milkNum = Number(milkProduced);
    if (milkProduced === "" || isNaN(milkNum) || milkNum <= 0) {
      newErrors.milk_produced = "Milk produced must be a positive number";
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
      cattle_id: selectedCattleId!,
      date_collected: dateCollected,
      animal_name: animalName || null,
      milk_produced: Number(milkProduced),
    };

    try {
      if (milkRecordToEdit && milkRecordToEdit.milk_id) {
        await axiosInstance.put(
          `/cattle-milk/update/${milkRecordToEdit.milk_id}`,
          payload
        );
      } else {
        await axiosInstance.post("/cattle-milk/add", payload);
      }
      onRecordSaved();
      onClose();
    } catch (error: any) {
      console.error("Error saving milk record:", error);
      setInfoModalState({
        isOpen: true,
        title: "Error",
        text: error.response?.data?.message || "Failed to save milk record.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const cattleOptions = allUserCattle.map((c) => ({
    id: c.cattle_id,
    name: c.cattle_name,
  }));

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
            {cattleOptions.length > 0 ? (
              <DropdownSmall
                label="Select Cattle Herd/Group"
                items={cattleOptions.map((c) => c.name)}
                selected={
                  cattleOptions.find((c) => c.id === selectedCattleId)?.name ||
                  ""
                }
                onSelect={(itemName) => {
                  const selected = cattleOptions.find(
                    (c) => c.name === itemName
                  );
                  if (selected) setSelectedCattleId(selected.id);
                }}
                placeholder="Choose cattle"
              />
            ) : (
              <p className="text-sm text-red-500">
                No cattle records found. Please add a cattle record first.
              </p>
            )}

            <TextField
              label="Date Collected"
              calendar
              value={dateCollected}
              onChange={(val) => setDateCollected(val)}
              errorMessage={errors.date_collected}
              width="large"
            />
            <TextField
              label="Cattle Name / Number"
              placeholder="e.g. Daisy, Tag #123"
              value={animalName}
              onChange={(val) => setAnimalName(val)}
              errorMessage={errors.animal_name}
              width="large"
            />
            <TextField
              label="Milk Produced (Liters)"
              number
              placeholder="e.g., 10.5"
              value={milkProduced === 0 ? "" : String(milkProduced)}
              onChange={(val) => setMilkProduced(val)}
              errorMessage={errors.milk_produced}
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
                    : milkRecordToEdit
                    ? "Update Record"
                    : "Add Record"
                }
                type="submit"
                style="primary"
                isDisabled={
                  isSubmitting ||
                  (cattleOptions.length === 0 && !milkRecordToEdit)
                }
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

export default CattleMilkModal;
