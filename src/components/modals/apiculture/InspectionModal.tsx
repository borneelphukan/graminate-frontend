import React, { useState, useEffect, useCallback } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import TextArea from "@/components/ui/TextArea";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";

export type InspectionData = {
  inspection_id?: number;
  hive_id: number;
  inspection_date: string;
  queen_status?: string;
  queen_introduced_date?: string;
  brood_pattern?: string;
  notes?: string;
  honey_stores_kg?: number;
  pest_infestation?: boolean;
  disease_detected?: boolean;
  swarm_risk?: boolean;
};

type InspectionFormState = {
  inspection_date: string;
  queen_status: string;
  queen_introduced_date: string;
  brood_pattern: string;
  notes: string;
  honey_stores_kg: string;
  pest_infestation: boolean;
  disease_detected: boolean;
  swarm_risk: boolean;
};

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  onInspectionSaved: () => void;
  hiveId: number;
  inspectionToEdit?: InspectionData | null;
}

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
    honey_stores_kg: "",
    pest_infestation: false,
    disease_detected: false,
    swarm_risk: false,
  });
  const [errors, setErrors] = useState<Partial<InspectionFormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({
      inspection_date: format(new Date(), "yyyy-MM-dd"),
      queen_status: "",
      queen_introduced_date: "",
      brood_pattern: "",
      notes: "",
      honey_stores_kg: "",
      pest_infestation: false,
      disease_detected: false,
      swarm_risk: false,
    });
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
          honey_stores_kg: inspectionToEdit.honey_stores_kg?.toString() ?? "",
          pest_infestation: inspectionToEdit.pest_infestation ?? false,
          disease_detected: inspectionToEdit.disease_detected ?? false,
          swarm_risk: inspectionToEdit.swarm_risk ?? false,
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
    if (formData.honey_stores_kg && isNaN(Number(formData.honey_stores_kg))) {
      newErrors.honey_stores_kg = "Must be a positive number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: Partial<InspectionData> = {
      hive_id: hiveId,
      inspection_date: formData.inspection_date,
      pest_infestation: formData.pest_infestation,
      disease_detected: formData.disease_detected,
      swarm_risk: formData.swarm_risk,
    };

    if (formData.queen_status) payload.queen_status = formData.queen_status;
    if (formData.queen_introduced_date) {
      payload.queen_introduced_date = formData.queen_introduced_date;
    }
    if (formData.brood_pattern) payload.brood_pattern = formData.brood_pattern;
    if (formData.notes) payload.notes = formData.notes;
    if (formData.honey_stores_kg) {
      payload.honey_stores_kg = Number(formData.honey_stores_kg);
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
    field: keyof InspectionFormState,
    value:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | string
      | boolean
  ) => {
    let processedValue: string | boolean;
    if (typeof value === "object" && "target" in value) {
      const target = value.target as HTMLInputElement;
      processedValue =
        target.type === "checkbox" ? target.checked : target.value;
    } else {
      processedValue = value;
    }
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
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
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
          <TextField
            label="Honey Stores (kg)"
            number
            placeholder="e.g. 5.5"
            value={formData.honey_stores_kg}
            onChange={(val) => handleInputChange("honey_stores_kg", val)}
            errorMessage={errors.honey_stores_kg}
            type={errors.honey_stores_kg ? "error" : ""}
          />

          <div className="p-4 border rounded-lg border-gray-300 dark:border-gray-600 space-y-3">
            <p className="font-semibold text-dark dark:text-light">
              Health Status
            </p>
            <Checkbox
              id="pest-infestation-checkbox"
              label="Pest Infestation Detected"
              checked={formData.pest_infestation}
              onChange={(checked) =>
                handleInputChange("pest_infestation", checked)
              }
            />
            <Checkbox
              id="disease-detected-checkbox"
              label="Disease Detected"
              checked={formData.disease_detected}
              onChange={(checked) =>
                handleInputChange("disease_detected", checked)
              }
            />
            <Checkbox
              id="swarm-risk-checkbox"
              label="Swarm Risk Identified"
              checked={formData.swarm_risk}
              onChange={(checked) => handleInputChange("swarm_risk", checked)}
            />
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
