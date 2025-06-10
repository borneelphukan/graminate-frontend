import React, { useState, useRef, useEffect, useCallback } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Checkbox from "@/components/ui/Checkbox";
import TextArea from "@/components/ui/TextArea";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";

export type HiveData = {
  hive_id?: number;
  apiary_id: number;
  hive_name: string;
  hive_type?: string;
  installation_date?: string | Date;
  queen_status?: string;
  queen_introduced_date?: string | Date;
  last_inspection_date?: string | Date;
  brood_pattern?: string;
  honey_stores_kg?: number | string;
  pest_infestation?: boolean;
  disease_detected?: boolean;
  swarm_risk?: boolean;
  ventilation_status?: string;
  notes?: string;
};

type HiveFormState = Omit<
  HiveData,
  "installation_date" | "queen_introduced_date" | "last_inspection_date"
> & {
  installation_date?: string;
  queen_introduced_date?: string;
  last_inspection_date?: string;
};

interface HiveFormProps extends SidebarProp {
  hiveToEdit?: HiveData | null;
  onHiveUpdateOrAdd?: (updatedOrAddedHive: HiveData) => void;
  apiaryId: number;
}

const HIVE_TYPES_STRUCTURED = {
  "Traditional / Fixed-Comb Hives": [
    "Wall Hives (Clay Pots / Log Hives)",
    "Bamboo Hives",
  ],
  "Modern / Movable Frame Hives": [
    "Langstroth Hive",
    "Newton Hive",
    "Jeolikote Hive",
    "Marathi Hive",
  ],
  "Hives for Stingless Bees": [
    "Bamboo / Coconut Shell Hives",
    "PVC / Wooden Box Hives",
  ],
  "Specialized Hives": ["Top-Bar Hive (TBH)", "Warre Hive (Vertical Top-Bar)"],
};

const HIVE_TYPE_CATEGORY_HEADERS: string[] = [];
const ALL_HIVE_TYPES: string[] = [];

Object.entries(HIVE_TYPES_STRUCTURED).forEach(([category, hives]) => {
  const header = `${category}`;
  HIVE_TYPE_CATEGORY_HEADERS.push(header);
  ALL_HIVE_TYPES.push(header);
  ALL_HIVE_TYPES.push(...hives);
});

const QUEEN_STATUS_OPTIONS = [
  "Present & Healthy",
  "Absent (No Queen)",
  "Weak (Poor Laying)",
  "Drone-Laying",
  "Virgin (Unmated)",
  "Recently Introduced",
  "Swarmed (Gone)",
];

const formatDateForInput = (date: string | Date | undefined): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

const HiveForm = ({
  onClose,
  formTitle,
  hiveToEdit,
  onHiveUpdateOrAdd,
  apiaryId,
}: HiveFormProps) => {
  const [animate, setAnimate] = useState(false);
  const [hiveData, setHiveData] = useState<HiveFormState>({
    apiary_id: apiaryId,
    hive_name: "",
    hive_type: "",
    installation_date: "",
    queen_status: "",
    queen_introduced_date: "",
    last_inspection_date: "",
    brood_pattern: "",
    honey_stores_kg: "",
    pest_infestation: false,
    disease_detected: false,
    swarm_risk: false,
    ventilation_status: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<HiveData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (hiveToEdit) {
      setHiveData({
        ...hiveToEdit,
        apiary_id: apiaryId,
        installation_date: formatDateForInput(hiveToEdit.installation_date),
        queen_introduced_date: formatDateForInput(
          hiveToEdit.queen_introduced_date
        ),
        last_inspection_date: formatDateForInput(
          hiveToEdit.last_inspection_date
        ),
        honey_stores_kg:
          hiveToEdit.honey_stores_kg !== undefined
            ? String(hiveToEdit.honey_stores_kg)
            : "",
      });
    }
  }, [hiveToEdit, apiaryId]);

  const handleClose = useCallback(() => {
    setAnimate(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useClickOutside(panelRef, handleClose);

  const validate = () => {
    const newErrors: Partial<HiveData> = {};
    if (!hiveData.hive_name.trim())
      newErrors.hive_name = "Hive name is required";
    if (hiveData.honey_stores_kg && isNaN(Number(hiveData.honey_stores_kg)))
      newErrors.honey_stores_kg = "Must be a number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const payload: Partial<HiveData> = { ...hiveData };
    if (payload.honey_stores_kg === "" || payload.honey_stores_kg === undefined)
      delete payload.honey_stores_kg;
    else payload.honey_stores_kg = Number(payload.honey_stores_kg);

    if (payload.installation_date === "") delete payload.installation_date;
    if (payload.queen_introduced_date === "")
      delete payload.queen_introduced_date;
    if (payload.last_inspection_date === "")
      delete payload.last_inspection_date;

    try {
      const response = hiveToEdit?.hive_id
        ? await axiosInstance.put(
            `/bee-hives/update/${hiveToEdit.hive_id}`,
            payload
          )
        : await axiosInstance.post(`/bee-hives/add`, payload);

      if (onHiveUpdateOrAdd) {
        onHiveUpdateOrAdd(response.data);
      }
      handleClose();
    } catch (error) {
      console.error("Failed to save hive", error);
      setErrors({ notes: "Failed to save hive. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof HiveFormState, value: any) => {
    setHiveData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof HiveData]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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
              {formTitle}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-dark dark:text-light dark:hover:text-gray-300 transition-colors"
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar"
          >
            <TextField
              label="Hive Name / Identifier Number"
              placeholder="Enter Hive Name or Identifier"
              value={hiveData.hive_name}
              onChange={(val) => handleInputChange("hive_name", val)}
              errorMessage={errors.hive_name as string}
              type={errors.hive_name ? "error" : ""}
            />
            <DropdownSmall
              label="Hive Type"
              items={ALL_HIVE_TYPES}
              selected={hiveData.hive_type || ""}
              onSelect={(val: string) => {
                if (!HIVE_TYPE_CATEGORY_HEADERS.includes(val)) {
                  handleInputChange("hive_type", val);
                }
              }}
              placeholder="Select a Hive Type"
              disabledItems={HIVE_TYPE_CATEGORY_HEADERS}
            />
            <TextField
              calendar
              label="Installation Date"
              value={hiveData.installation_date || ""}
              onChange={(val) => handleInputChange("installation_date", val)}
            />
            <DropdownSmall
              label="Queen Status"
              items={QUEEN_STATUS_OPTIONS}
              selected={hiveData.queen_status || ""}
              onSelect={(val: string) => handleInputChange("queen_status", val)}
              placeholder="Select Queen Status"
            />
            <TextField
              calendar
              label="Queen Introduced Date"
              value={hiveData.queen_introduced_date || ""}
              onChange={(val) =>
                handleInputChange("queen_introduced_date", val)
              }
            />
            <TextField
              calendar
              label="Last Inspection Date"
              value={hiveData.last_inspection_date || ""}
              onChange={(val) => handleInputChange("last_inspection_date", val)}
            />
            <TextField
              label="Brood Pattern (e.g. Good, Spotty)"
              value={hiveData.brood_pattern || ""}
              onChange={(val) => handleInputChange("brood_pattern", val)}
            />
            <TextField
              number
              label="Honey Stores (kg)"
              value={String(hiveData.honey_stores_kg) || ""}
              onChange={(val) => handleInputChange("honey_stores_kg", val)}
              errorMessage={errors.honey_stores_kg as string}
              type={errors.honey_stores_kg ? "error" : ""}
            />
            <div className="flex items-center gap-4">
              <Checkbox
                id="pest_infestation"
                label="Pest Infestation"
                checked={hiveData.pest_infestation || false}
                onChange={(e) =>
                  handleInputChange("pest_infestation", e.target.checked)
                }
              />
              <Checkbox
                id="disease_detected"
                label="Disease Detected"
                checked={hiveData.disease_detected || false}
                onChange={(e) =>
                  handleInputChange("disease_detected", e.target.checked)
                }
              />
              <Checkbox
                id="swarm_risk"
                label="Swarm Risk"
                checked={hiveData.swarm_risk || false}
                onChange={(e) =>
                  handleInputChange("swarm_risk", e.target.checked)
                }
              />
            </div>
            <TextField
              label="Ventilation Status (e.g. Good, Blocked)"
              value={hiveData.ventilation_status || ""}
              onChange={(val) => handleInputChange("ventilation_status", val)}
            />
            <TextArea
              label="Notes"
              value={hiveData.notes || ""}
              onChange={(val) => handleInputChange("notes", val)}
            />
            {errors.notes && (
              <p className="text-red-500 text-xs mt-1">{errors.notes}</p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
              <Button
                text="Cancel"
                style="secondary"
                onClick={handleClose}
                isDisabled={isLoading}
              />
              <Button
                text={hiveToEdit ? "Update Hive" : "Add Hive"}
                style="primary"
                type="submit"
                isDisabled={isLoading}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HiveForm;
