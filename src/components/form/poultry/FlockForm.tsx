import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import { POULTRY_TYPES, HOUSING_TYPES } from "@/constants/options";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import TextArea from "../../ui/TextArea";

type FlockData = {
  flock_id?: number;
  user_id: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};

interface FlockFormProps extends SidebarProp {
  flockToEdit?: FlockData | null;
  onFlockUpdateOrAdd?: (updatedOrAddedFlock: FlockData) => void;
}

type FlockFormState = {
  flock_name: string;
  flock_type: string;
  quantity: number | string;
  breed: string;
  source: string;
  housing_type: string;
  notes: string;
};

type FlockFormErrors = {
  flock_name?: string;
  flock_type?: string;
  quantity?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};

type FlockPayload = {
  flock_name: string;
  flock_type: string;
  quantity: number;
  user_id: number;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
};

const POULTRY_BREEDS_STRUCTURED = {
  Chickens: [
    "White Leghorn (Layer)",
    "Rhode Island Red (Layer)",
    "Gramapriya (Layer)",
    "Cobb 500 (Broiler)",
    "Ross 308 (Broiler)",
    "Hubbard (Broiler)",
    "Vencobb 430Y (Broiler)",
    "Caribro Vishal (Broiler)",
    "Giriraja (Dual-Purpose)",
    "Vanaraja (Dual-Purpose)",
    "Aseel (Breeder)",
    "Kadaknath (Breeder)",
    "Sasso (Breeder)",
    "Kuroiler (Breeder)",
  ],
  Ducks: [
    "Indian Runner (Layer)",
    "Khaki Campbell (Layer)",
    "Pekin (Breeder)",
    "Muscovy (Breeder)",
  ],
  Quails: ["Japanese Quail (Coturnix) (Layer)", "Bobwhite (Breeder)"],
  Turkeys: ["Broad-Breasted White (Breeder)", "Desi Turkey (Breeder)"],
  Geese: ["Emden (Breeder)", "Local Desi Goose (Breeder)"],
  Others: ["Guinea Fowl (Breeder)", "Pigeons (Squab) (Breeder)"],
};

const BREED_CATEGORY_HEADERS: string[] = [];
const ALL_BREED_ITEMS: string[] = [];

Object.entries(POULTRY_BREEDS_STRUCTURED).forEach(([category, breeds]) => {
  const header = `${category}`;
  BREED_CATEGORY_HEADERS.push(header);
  ALL_BREED_ITEMS.push(header);
  ALL_BREED_ITEMS.push(...breeds);
});

const FlockForm = ({
  onClose,
  formTitle,
  flockToEdit,
  onFlockUpdateOrAdd,
}: FlockFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [flockData, setFlockData] = useState<FlockFormState>({
    flock_name: "",
    flock_type: "",
    quantity: "",
    breed: "",
    source: "",
    housing_type: "",
    notes: "",
  });
  const [flockErrors, setFlockErrors] = useState<FlockFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const [filteredBreedItems, setFilteredBreedItems] =
    useState<string[]>(ALL_BREED_ITEMS);
  const [filteredBreedCategoryHeaders, setFilteredBreedCategoryHeaders] =
    useState<string[]>(BREED_CATEGORY_HEADERS);

  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  useEffect(() => {
    if (flockToEdit) {
      setFlockData({
        flock_name: flockToEdit.flock_name || "",
        flock_type: flockToEdit.flock_type || "",
        quantity: flockToEdit.quantity || "",
        breed: flockToEdit.breed || "",
        source: flockToEdit.source || "",
        housing_type: flockToEdit.housing_type || "",
        notes: flockToEdit.notes || "",
      });
    } else {
      setFlockData({
        flock_name: "",
        flock_type: "",
        quantity: "",
        breed: "",
        source: "",
        housing_type: "",
        notes: "",
      });
    }
  }, [flockToEdit]);

  useEffect(() => {
    const selectedType = flockData.flock_type;

    const typeToFilterTerm: { [key: string]: string } = {
      Layers: "(Layer)",
      "Dual-Purpose": "(Dual-Purpose)",
      Broiler: "(Broiler)",
      Breeder: "(Breeder)",
    };

    const filterTerm = typeToFilterTerm[selectedType];

    if (!filterTerm) {
      setFilteredBreedItems(ALL_BREED_ITEMS);
      setFilteredBreedCategoryHeaders(BREED_CATEGORY_HEADERS);
      return;
    }

    const newFilteredItems: string[] = [];
    const newFilteredHeaders: string[] = [];

    Object.entries(POULTRY_BREEDS_STRUCTURED).forEach(([category, breeds]) => {
      const matchingBreeds = breeds.filter((breed) =>
        breed.includes(filterTerm)
      );

      if (matchingBreeds.length > 0) {
        newFilteredHeaders.push(category);
        newFilteredItems.push(category, ...matchingBreeds);
      }
    });

    setFilteredBreedItems(newFilteredItems);
    setFilteredBreedCategoryHeaders(newFilteredHeaders);
  }, [flockData.flock_type]);

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
    const errors: FlockFormErrors = {};
    let isValid = true;

    if (!flockData.flock_name.trim()) {
      errors.flock_name = "Flock Name is required.";
      isValid = false;
    }
    if (!flockData.flock_type) {
      errors.flock_type = "Flock Type is required.";
      isValid = false;
    }
    if (
      flockData.quantity === null ||
      flockData.quantity === undefined ||
      String(flockData.quantity).trim() === ""
    ) {
      errors.quantity = "Number of birds required.";
      isValid = false;
    } else if (isNaN(Number(flockData.quantity))) {
      errors.quantity = "Number of birds must be a valid number.";
      isValid = false;
    } else if (Number(flockData.quantity) < 0) {
      errors.quantity = "Number of birds cannot be negative.";
      isValid = false;
    }
    setFlockErrors(errors);
    return isValid;
  };

  const handleSubmitFlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!parsedUserId) {
      alert("User ID is missing.");
      return;
    }

    setIsLoading(true);
    const payload: FlockPayload = {
      flock_name: flockData.flock_name,
      flock_type: flockData.flock_type,
      quantity: Number(flockData.quantity),
      user_id: Number(parsedUserId),
    };

    if (flockData.breed.trim()) payload.breed = flockData.breed;
    if (flockData.source.trim()) payload.source = flockData.source;
    if (flockData.housing_type) payload.housing_type = flockData.housing_type;
    if (flockData.notes.trim()) payload.notes = flockData.notes;

    let response;
    if (flockToEdit && flockToEdit.flock_id) {
      response = await axiosInstance.put(
        `/flock/update/${flockToEdit.flock_id}`,
        payload
      );
    } else {
      response = await axiosInstance.post(`/flock/add`, payload);
    }

    if (onFlockUpdateOrAdd) {
      onFlockUpdateOrAdd(response.data);
    }
    setIsLoading(false);
    handleClose();
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
                (flockToEdit ? "Edit Flock Details" : "Add New Flock")}
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
              onSubmit={handleSubmitFlock}
              noValidate
            >
              <TextField
                label="Flock Name"
                placeholder="e.g. Layer Batch 1"
                value={flockData.flock_name}
                onChange={(val: string) => {
                  setFlockData({ ...flockData, flock_name: val });
                  setFlockErrors({ ...flockErrors, flock_name: undefined });
                }}
                type={flockErrors.flock_name ? "error" : ""}
                errorMessage={flockErrors.flock_name}
              />
              <DropdownLarge
                label="Flock Type"
                items={POULTRY_TYPES}
                selectedItem={flockData.flock_type}
                onSelect={(val: string) => {
                  setFlockData({ ...flockData, flock_type: val, breed: "" });
                  setFlockErrors({ ...flockErrors, flock_type: undefined });
                }}
                type="form"
                width="full"
              />
              {flockErrors.flock_type && (
                <p className="text-xs text-red-200 -mt-2 ml-1">
                  {flockErrors.flock_type}
                </p>
              )}
              <TextField
                number
                label="Quantity"
                placeholder="e.g. 100"
                value={String(flockData.quantity)}
                onChange={(val: string) => {
                  setFlockData({
                    ...flockData,
                    quantity: val === "" ? "" : parseInt(val, 10),
                  });
                  setFlockErrors({ ...flockErrors, quantity: undefined });
                }}
                type={flockErrors.quantity ? "error" : ""}
                errorMessage={flockErrors.quantity}
              />

              <DropdownSmall
                label="Breed (Optional)"
                items={filteredBreedItems}
                selected={flockData.breed}
                onSelect={(val: string) => {
                  setFlockData({ ...flockData, breed: val });
                }}
                placeholder="Select a breed"
                disabledItems={filteredBreedCategoryHeaders}
              />
              <TextField
                label="Source (Optional)"
                placeholder="e.g. Local Hatchery, Self-bred"
                value={flockData.source}
                onChange={(val: string) => {
                  setFlockData({ ...flockData, source: val });
                }}
              />
              <DropdownLarge
                label="Housing Type (Optional)"
                items={HOUSING_TYPES.map((h) => h.name)}
                selectedItem={flockData.housing_type}
                onSelect={(val: string) => {
                  setFlockData({ ...flockData, housing_type: val });
                }}
                type="form"
                width="full"
              />
              <TextArea
                label="Notes (Optional)"
                placeholder="e.g. Aggression, pecking order, stress indicators"
                value={flockData.notes}
                onChange={(val: string) => {
                  setFlockData({ ...flockData, notes: val });
                }}
              />

              <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                <Button
                  text="Cancel"
                  style="secondary"
                  onClick={handleClose}
                  isDisabled={isLoading}
                />
                <Button
                  text={flockToEdit ? "Update Flock" : "Create Flock"}
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

export default FlockForm;
