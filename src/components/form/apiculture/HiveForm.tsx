import React, { useState, useRef, useEffect, useCallback } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import TextArea from "@/components/ui/TextArea";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";

export type HiveData = {
  hive_id?: number;
  apiary_id: number;
  hive_name: string;
  hive_type?: string;
  bee_species?: string;
  installation_date?: string | Date;
  ventilation_status?: string;
  notes?: string;
  last_inspection_date?: string | Date;
  queen_status?: string;
  brood_pattern?: string;
  honey_stores_kg?: number;
  pest_infestation?: boolean;
  disease_detected?: boolean;
  swarm_risk?: boolean;
};

type HiveFormState = {
  hive_name: string;
  hive_type: string;
  bee_species: string;
  installation_date: string;
  ventilation_status: string;
  notes: string;
};

interface HiveFormProps extends SidebarProp {
  hiveToEdit?: HiveData | null;
  onHiveUpdateOrAdd: (updatedOrAddedHive: HiveData) => void;
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

const BEE_SPECIES_STRUCTURED = {
  "Indigenous (Native) Bees": [
    "Rock Bee / Giant Honey Bee (Apis dorsata)",
    "Indian Hive Bee (Apis cerana indica)",
    "Dwarf Honey Bee (Apis florea)",
    "Stingless Bee (Tetragonula iridipennis, formerly Trigona iridipennis)",
  ],
  "Exotic (Introduced) Bees": ["European Honey Bee (Apis mellifera)"],
};

const BEE_SPECIES_CATEGORY_HEADERS: string[] = [];
const ALL_BEE_SPECIES: string[] = [];

Object.entries(BEE_SPECIES_STRUCTURED).forEach(([category, species]) => {
  const header = `${category}`;
  BEE_SPECIES_CATEGORY_HEADERS.push(header);
  ALL_BEE_SPECIES.push(header);
  ALL_BEE_SPECIES.push(...species);
});

const VENTILATION_STATUS_OPTIONS = [
  "Top Ventilation (Upper Hive Venting)",
  "Bottom Ventilation (Lower Hive Venting)",
  "Side Ventilation (Cross-Flow Air)",
  "Entrance Ventilation",
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
    hive_name: "",
    hive_type: "",
    bee_species: "",
    installation_date: "",
    ventilation_status: "",
    notes: "",
  });
  const [errors, setErrors] = useState<{ hive_name?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (hiveToEdit) {
      setHiveData({
        hive_name: hiveToEdit.hive_name || "",
        hive_type: hiveToEdit.hive_type || "",
        bee_species: hiveToEdit.bee_species || "",
        installation_date: formatDateForInput(hiveToEdit.installation_date),
        ventilation_status: hiveToEdit.ventilation_status || "",
        notes: hiveToEdit.notes || "",
      });
    }
  }, [hiveToEdit]);

  const handleClose = useCallback(() => {
    setAnimate(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useClickOutside(panelRef, handleClose);

  const validate = () => {
    const newErrors: { hive_name?: string } = {};
    if (!hiveData.hive_name.trim())
      newErrors.hive_name = "Hive name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const payload: Omit<HiveData, "last_inspection_date"> = {
      apiary_id: apiaryId,
      ...hiveData,
    };
    if (payload.installation_date === "") delete payload.installation_date;

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
      setErrors({ hive_name: "Failed to save hive. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof HiveFormState, value: any) => {
    setHiveData((prev) => ({ ...prev, [field]: value }));
    if (errors.hive_name) {
      setErrors((prev) => ({ ...prev, hive_name: undefined }));
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
              errorMessage={errors.hive_name}
              type={errors.hive_name ? "error" : ""}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DropdownSmall
                label="Hive Type"
                items={ALL_HIVE_TYPES}
                selected={hiveData.hive_type}
                onSelect={(val: string) => {
                  if (!HIVE_TYPE_CATEGORY_HEADERS.includes(val)) {
                    handleInputChange("hive_type", val);
                  }
                }}
                placeholder="Select a Hive Type"
                disabledItems={HIVE_TYPE_CATEGORY_HEADERS}
              />
              <DropdownSmall
                label="Bee Species"
                items={ALL_BEE_SPECIES}
                selected={hiveData.bee_species}
                onSelect={(val: string) => {
                  if (!BEE_SPECIES_CATEGORY_HEADERS.includes(val)) {
                    handleInputChange("bee_species", val);
                  }
                }}
                placeholder="Select Bee Species"
                disabledItems={BEE_SPECIES_CATEGORY_HEADERS}
              />
            </div>

            <TextField
              calendar
              label="Installation Date"
              value={hiveData.installation_date}
              onChange={(val) => handleInputChange("installation_date", val)}
            />

            <DropdownSmall
              label="Ventilation Status"
              items={VENTILATION_STATUS_OPTIONS}
              selected={hiveData.ventilation_status}
              onSelect={(val: string) =>
                handleInputChange("ventilation_status", val)
              }
              placeholder="Select Ventilation Status"
            />
            <TextArea
              label="Notes (Optional)"
              value={hiveData.notes}
              onChange={(val) => handleInputChange("notes", val)}
            />

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
