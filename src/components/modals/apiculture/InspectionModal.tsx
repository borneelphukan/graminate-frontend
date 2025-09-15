import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import TextArea from "@/components/ui/TextArea";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
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
  symptoms?: string[];
  population_strength?: string;
  frames_of_brood?: number;
  frames_of_nectar_honey?: number;
  frames_of_pollen?: number;
  room_to_lay?: string;
  queen_cells_observed?: string;
  queen_cells_count?: number;
  varroa_mite_method?: string;
  varroa_mite_count?: number;
  actions_taken?: string;
};

type InspectionFormState = {
  inspection_date: string;
  queen_status: string;
  queen_introduced_date: string;
  brood_pattern: string;
  notes: string;
  symptoms: string[];
  population_strength: string;
  frames_of_brood: string;
  frames_of_nectar_honey: string;
  frames_of_pollen: string;
  room_to_lay: string;
  queen_cells_observed: string;
  queen_cells_count: string;
  varroa_mite_method: string;
  varroa_mite_count: string;
  actions_taken: string;
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
const POPULATION_STRENGTH_OPTIONS = ["Booming", "Strong", "Moderate", "Weak"];
const ROOM_TO_LAY_OPTIONS = ["Plenty", "Adequate", "Limited", "None"];
const QUEEN_CELLS_OBSERVED_OPTIONS = ["Yes", "No"];
const VARROA_MITE_METHODS = [
  "Alcohol Wash",
  "Sugar Shake",
  "Sticky Board",
  "Visual Inspection",
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
    symptoms: [],
    population_strength: "",
    frames_of_brood: "",
    frames_of_nectar_honey: "",
    frames_of_pollen: "",
    room_to_lay: "",
    queen_cells_observed: "",
    queen_cells_count: "",
    varroa_mite_method: "",
    varroa_mite_count: "",
    actions_taken: "",
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
      population_strength: "",
      frames_of_brood: "",
      frames_of_nectar_honey: "",
      frames_of_pollen: "",
      room_to_lay: "",
      queen_cells_observed: "",
      queen_cells_count: "",
      varroa_mite_method: "",
      varroa_mite_count: "",
      actions_taken: "",
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
          symptoms: inspectionToEdit.symptoms || [],
          population_strength: inspectionToEdit.population_strength || "",
          frames_of_brood: String(inspectionToEdit.frames_of_brood ?? ""),
          frames_of_nectar_honey: String(
            inspectionToEdit.frames_of_nectar_honey ?? ""
          ),
          frames_of_pollen: String(inspectionToEdit.frames_of_pollen ?? ""),
          room_to_lay: inspectionToEdit.room_to_lay || "",
          queen_cells_observed: inspectionToEdit.queen_cells_observed || "",
          queen_cells_count: String(inspectionToEdit.queen_cells_count ?? ""),
          varroa_mite_method: inspectionToEdit.varroa_mite_method || "",
          varroa_mite_count: String(inspectionToEdit.varroa_mite_count ?? ""),
          actions_taken: inspectionToEdit.actions_taken || "",
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
    if (!formData.inspection_date)
      newErrors.inspection_date = "Inspection date is required";
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

    const payload: Partial<InspectionData> = {
      ...formData,
      hive_id: hiveId,
      frames_of_brood: formData.frames_of_brood
        ? parseInt(formData.frames_of_brood, 10)
        : undefined,
      frames_of_nectar_honey: formData.frames_of_nectar_honey
        ? parseInt(formData.frames_of_nectar_honey, 10)
        : undefined,
      frames_of_pollen: formData.frames_of_pollen
        ? parseInt(formData.frames_of_pollen, 10)
        : undefined,
      queen_cells_count: formData.queen_cells_count
        ? parseInt(formData.queen_cells_count, 10)
        : undefined,
      varroa_mite_count: formData.varroa_mite_count
        ? parseInt(formData.varroa_mite_count, 10)
        : undefined,
    };

    if (!payload.queen_introduced_date)
      payload.queen_introduced_date = undefined;

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

  const handleInputChange = (field: keyof InspectionFormState, value: any) => {
    setFormData((prev) => {
      const newState = { ...prev, [field]: value };
      if (field === "queen_cells_observed" && value !== "Yes") {
        newState.queen_cells_count = "";
      }
      if (field === "varroa_mite_method" && !value) {
        newState.varroa_mite_count = "";
      }
      return newState;
    });
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [field as keyof typeof errors]: undefined,
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl custom-scrollbar">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropdownSmall
              label="Brood Pattern"
              items={BROOD_PATTERN_OPTIONS}
              selected={formData.brood_pattern}
              onSelect={(val) => handleInputChange("brood_pattern", val)}
              placeholder="Select Brood Pattern"
            />
            <DropdownSmall
              label="Population Strength"
              items={POPULATION_STRENGTH_OPTIONS}
              selected={formData.population_strength}
              onSelect={(val) => handleInputChange("population_strength", val)}
              placeholder="Select Population"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frame Estimates
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg border-gray-300 dark:border-gray-600">
              <TextField
                label="Brood"
                value={formData.frames_of_brood}
                onChange={(val: string) =>
                  handleInputChange("frames_of_brood", val)
                }
              />
              <TextField
                label="Nectar/Honey"
                value={formData.frames_of_nectar_honey}
                onChange={(val: string) =>
                  handleInputChange("frames_of_nectar_honey", val)
                }
              />
              <TextField
                label="Pollen"
                value={formData.frames_of_pollen}
                onChange={(val: string) =>
                  handleInputChange("frames_of_pollen", val)
                }
              />
            </div>
          </div>

          <DropdownSmall
            label="Room to Lay?"
            items={ROOM_TO_LAY_OPTIONS}
            selected={formData.room_to_lay}
            onSelect={(val) => handleInputChange("room_to_lay", val)}
            placeholder="Select available space"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropdownSmall
              label="Queen Cells Observed?"
              items={QUEEN_CELLS_OBSERVED_OPTIONS}
              selected={formData.queen_cells_observed}
              onSelect={(val) => handleInputChange("queen_cells_observed", val)}
              placeholder="Select Yes or No"
            />
            <TextField
              label="Count"
              value={formData.queen_cells_count}
              onChange={(val: string) =>
                handleInputChange("queen_cells_count", val)
              }
              isDisabled={formData.queen_cells_observed !== "Yes"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropdownSmall
              label="Varroa Mite Method"
              items={VARROA_MITE_METHODS}
              selected={formData.varroa_mite_method}
              onSelect={(val) => handleInputChange("varroa_mite_method", val)}
              placeholder="Select Test Method"
            />
            <TextField
              label="Count"
              value={formData.varroa_mite_count}
              onChange={(val: string) =>
                handleInputChange("varroa_mite_count", val)
              }
              isDisabled={!formData.varroa_mite_method}
            />
          </div>

          <div className="p-4 border rounded-lg border-gray-300 dark:border-gray-600 space-y-3">
            <p className="font-semibold text-dark dark:text-light mb-1">
              Symptoms Observed
            </p>
            <div className="flex items-center gap-2">
              <TextField
                value={currentSymptom}
                onChange={(val: string) => setCurrentSymptom(val)}
                placeholder="e.g., Varroa mites, chalkbrood"
                onKeyDown={handleSymptomKeyDown}
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
            label="Actions Taken"
            value={formData.actions_taken}
            onChange={(val) => handleInputChange("actions_taken", val)}
          />
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
