import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import TextArea from "@/components/ui/TextArea";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import TextField from "@/components/ui/TextField";

export type InspectionData = {
  inspection_id?: number;
  hive_id: number;
  inspection_date: string;
  queen_status?: string;
  queen_introduced_date?: string;
  brood_pattern?: string;
  notes?: string;
  symptoms?: string[]; // Updated field
};

type InspectionFormState = {
  inspection_date: string;
  queen_status: string;
  queen_introduced_date: string;
  brood_pattern: string;
  notes: string;
  symptoms: string[]; // Updated field
};

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  onInspectionSaved: () => void;
  hiveId: number;
  inspectionToEdit?: InspectionData | null;
}

// ... (QUEEN_STATUS_OPTIONS and BROOD_PATTERN_OPTIONS remain the same)
const QUEEN_STATUS_OPTIONS = [
  "Present & Healthy",
  "Absent (No Queen)",
  "Weak (Poor Laying)",
  "Drone-Laying",
  "Virgin (Unmated)",
  "Recently Introduced",
  "Swarmed (Gone)",
];

const BROOD_PATTERN_OPTIONS = [
  "Good (Healthy)",
  "Spotty (Irregular)",
  "Drone-Laying",
  "No Brood (Empty Comb)",
];

const InspectionModal = ({
  isOpen,
  onClose,
  formTitle,
  onInspectionSaved,
  hiveId,
  inspectionToEdit,
}: InspectionModalProps) => {
  const [formData, setFormData] = useState<InspectionFormState>({
    inspection_date: format(new Date(), "yyyy-MM-dd"),
    queen_status: "",
    queen_introduced_date: "",
    brood_pattern: "",
    notes: "",
    symptoms: [], // Initialize as an empty array
  });
  const [currentSymptom, setCurrentSymptom] = useState("");
  const [errors, setErrors] = useState<Partial<InspectionFormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({
      inspection_date: format(new Date(), "yyyy-MM-dd"),
      queen_status: "",
      queen_introduced_date: "",
      brood_pattern: "",
      notes: "",
      symptoms: [],
    });
    setCurrentSymptom("");
    setErrors({});
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (inspectionToEdit) {
        setFormData({
          inspection_date: format(
            new Date(inspectionToEdit.inspection_date),
            "yyyy-MM-dd"
          ),
          queen_status: inspectionToEdit.queen_status || "",
          queen_introduced_date: inspectionToEdit.queen_introduced_date
            ? format(
                new Date(inspectionToEdit.queen_introduced_date),
                "yyyy-MM-dd"
              )
            : "",
          brood_pattern: inspectionToEdit.brood_pattern || "",
          notes: inspectionToEdit.notes || "",
          symptoms: inspectionToEdit.symptoms || [], // Populate symptoms
        });
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
  }, [inspectionToEdit, isOpen, resetForm]);

  const validate = () => {
    const newErrors: Partial<InspectionFormState> = {};
    if (!formData.inspection_date) {
      newErrors.inspection_date = "Inspection date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSymptom = () => {
    if (
      currentSymptom.trim() !== "" &&
      !formData.symptoms.includes(currentSymptom.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        symptoms: [...prev.symptoms, currentSymptom.trim()],
      }));
      setCurrentSymptom("");
    }
  };

  const handleRemoveSymptom = (symptomToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((s) => s !== symptomToRemove),
    }));
  };

  const handleSymptomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSymptom();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: Partial<InspectionData> = { ...formData, hive_id: hiveId };

    // Ensure empty strings are not sent for optional date fields
    if (!payload.queen_introduced_date) {
      payload.queen_introduced_date = undefined;
    }

    try {
      if (inspectionToEdit && inspectionToEdit.inspection_id) {
        await axiosInstance.put(
          `/hive-inspections/update/${inspectionToEdit.inspection_id}`,
          payload
        );
      } else {
        await axiosInstance.post(`/hive-inspections/add`, payload);
      }
      onInspectionSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save inspection", error);
      setErrors({ notes: "Failed to save inspection. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof Omit<InspectionFormState, "symptoms">, // Exclude symptoms from this handler
    value: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string
  ) => {
    const processedValue =
      typeof value === "object" && "target" in value
        ? value.target.value
        : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-400 dark:border-gray-600">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {formTitle}
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-500 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TextField
            calendar
            label="Inspection Date"
            value={formData.inspection_date}
            onChange={(val) => handleInputChange("inspection_date", val)}
            errorMessage={errors.inspection_date}
            type={errors.inspection_date ? "error" : ""}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropdownSmall
              label="Queen Status"
              items={QUEEN_STATUS_OPTIONS}
              selected={formData.queen_status}
              onSelect={(val) => handleInputChange("queen_status", val)}
              placeholder="Select Queen Status"
            />
            <TextField
              calendar
              label="Queen Introduced Date"
              value={formData.queen_introduced_date}
              onChange={(val) =>
                handleInputChange("queen_introduced_date", val)
              }
            />
          </div>
          <DropdownSmall
            label="Brood Pattern"
            items={BROOD_PATTERN_OPTIONS}
            selected={formData.brood_pattern}
            onSelect={(val) => handleInputChange("brood_pattern", val)}
            placeholder="Select Brood Pattern"
          />

          {/* New Symptoms Input Section */}
          <div className="p-4 border rounded-lg border-gray-300 dark:border-gray-600 space-y-3">
            <p className="font-semibold text-dark dark:text-light mb-1">
              Symptoms Observed
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                onKeyDown={handleSymptomKeyDown}
                placeholder="e.g., Varroa mites, chalkbrood"
                className="flex-grow w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow-sm appearance-none focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              />
              <Button
                text="Add"
                type="button"
                style="secondary"
                onClick={handleAddSymptom}
                aria-label="Add symptom"
              />
            </div>
            {formData.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.symptoms.map((symptom) => (
                  <div
                    key={symptom}
                    className="flex items-center bg-green-400 text-green-800 text-sm font-medium px-2.5 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300"
                  >
                    <span>{symptom}</span>

                    <button
                      type="button"
                      onClick={() => handleRemoveSymptom(symptom)}
                      className="ml-2 text-green-200 hover:text-green-100"
                      aria-label={`Remove ${symptom}`}
                    >
                      <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <TextArea
            label="General Inspection Notes (Optional)"
            value={formData.notes}
            onChange={(val) => handleInputChange("notes", val)}
          />
          {errors.notes && (
            <p className="text-red-500 text-xs mt-1">{errors.notes}</p>
          )}

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
                  : inspectionToEdit
                  ? "Update Inspection"
                  : "Add Inspection"
              }
              type="submit"
              style="primary"
              isDisabled={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default InspectionModal;
