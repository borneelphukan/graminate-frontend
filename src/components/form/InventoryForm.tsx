import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { UNITS } from "@/constants/options";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "../ui/Loader";

interface InventoryFormProps extends SidebarProp {
  warehouseId?: number;
}

type InventoryItemData = {
  itemName: string;
  itemGroup: string;
  units: string;
  quantity: string;
  pricePerUnit: string;
  minimumLimit: string;
  feed: boolean;
};

type InventoryFormErrors = {
  itemName?: string;
  itemGroup?: string;
  units?: string;
  quantity?: string;
  pricePerUnit?: string;
  minimumLimit?: string;
};

type InventoryItemPayload = {
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  price_per_unit: number;
  warehouse_id: number;
  minimum_limit?: number;
  feed: boolean;
}

const InventoryForm = ({
  onClose,
  formTitle,
  warehouseId,
}: InventoryFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [inventoryItem, setInventoryItem] = useState<InventoryItemData>({
    itemName: "",
    itemGroup: "",
    units: "",
    quantity: "",
    pricePerUnit: "",
    minimumLimit: "",
    feed: false,
  });
  const [inventoryErrors, setInventoryErrors] = useState<InventoryFormErrors>(
    {}
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useAnimatePanel(setAnimate);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      if (!parsedUserId) {
        setIsLoadingSubTypes(false);
        setSubTypes([]);
        return;
      }
      setIsLoadingSubTypes(true);
      try {
        const response = await axiosInstance.get(`/user/${parsedUserId}`);
        const user = response.data?.data?.user ?? response.data?.user;
        if (!user) {
          setSubTypes([]);
        } else {
          setSubTypes(Array.isArray(user.sub_type) ? user.sub_type : []);
        }
      } catch (err) {
        console.error("Error fetching user sub_types:", err);
        setSubTypes([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };

    fetchUserSubTypes();
  }, [parsedUserId]);

  const validateForm = (): boolean => {
    const errors: InventoryFormErrors = {};
    let isValid = true;

    if (!inventoryItem.itemName.trim()) {
      errors.itemName = "Item Name is required.";
      isValid = false;
    }
    if (!inventoryItem.itemGroup.trim()) {
      errors.itemGroup = "Item Occupation is required.";
      isValid = false;
    }
    if (!inventoryItem.units) {
      errors.units = "Units are required.";
      isValid = false;
    }
    if (!inventoryItem.quantity.trim()) {
      errors.quantity = "Quantity is required.";
      isValid = false;
    } else if (isNaN(Number(inventoryItem.quantity))) {
      errors.quantity = "Quantity must be a valid number.";
      isValid = false;
    } else if (Number(inventoryItem.quantity) < 0) {
      errors.quantity = "Quantity cannot be negative.";
      isValid = false;
    }

    if (!inventoryItem.pricePerUnit.trim()) {
      errors.pricePerUnit = "Price Per Unit is required.";
      isValid = false;
    } else if (isNaN(Number(inventoryItem.pricePerUnit))) {
      errors.pricePerUnit = "Price Per Unit must be a valid number.";
      isValid = false;
    } else if (Number(inventoryItem.pricePerUnit) < 0) {
      errors.pricePerUnit = "Price Per Unit cannot be negative.";
      isValid = false;
    }

    if (
      inventoryItem.minimumLimit.trim() &&
      isNaN(Number(inventoryItem.minimumLimit))
    ) {
      errors.minimumLimit = "Minimum Limit must be a valid number if provided.";
      isValid = false;
    } else if (
      inventoryItem.minimumLimit.trim() &&
      Number(inventoryItem.minimumLimit) < 0
    ) {
      errors.minimumLimit = "Minimum Limit cannot be negative.";
      isValid = false;
    }

    setInventoryErrors(errors);
    return isValid;
  };

  const handleItemCategoryInputChange = (val: string) => {
    setInventoryItem({ ...inventoryItem, itemGroup: val });
    setInventoryErrors({ ...inventoryErrors, itemGroup: undefined });

    if (val.length > 0) {
      const filtered = subTypes.filter((subType) =>
        subType.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(subTypes);
      setShowSuggestions(true);
    }
  };

  const selectCategorySuggestion = (suggestion: string) => {
    setInventoryItem({ ...inventoryItem, itemGroup: suggestion });
    setInventoryErrors({ ...inventoryErrors, itemGroup: undefined });
    setShowSuggestions(false);
  };

  const handleItemCategoryInputFocus = () => {
    if (subTypes.length > 0) {
      if (!inventoryItem.itemGroup) {
        setSuggestions(subTypes);
      } else {
        const filtered = subTypes.filter((subType) =>
          subType.toLowerCase().includes(inventoryItem.itemGroup.toLowerCase())
        );
        setSuggestions(filtered);
      }
      setShowSuggestions(true);
    }
  };

  const handleSubmitInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!parsedUserId) {
      alert("User ID is missing. Cannot create inventory item.");
      return;
    }
    if (!warehouseId) {
      alert("Warehouse ID is missing. Cannot create inventory item.");
      return;
    }

    const payload: InventoryItemPayload = {
      user_id: Number(parsedUserId),
      item_name: inventoryItem.itemName,
      item_group: inventoryItem.itemGroup,
      units: inventoryItem.units,
      quantity: Number(inventoryItem.quantity),
      price_per_unit: Number(inventoryItem.pricePerUnit),
      warehouse_id: warehouseId,
      feed: inventoryItem.feed,
    };

    if (inventoryItem.minimumLimit.trim()) {
      payload.minimum_limit = Number(inventoryItem.minimumLimit);
    }

    await axiosInstance.post(`/inventory/add`, payload);
    setInventoryItem({
      itemName: "",
      itemGroup: "",
      units: "",
      quantity: "",
      pricePerUnit: "",
      minimumLimit: "",
      feed: false,
    });
    setInventoryErrors({});
    handleClose();
    window.location.reload();
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
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-dark dark:text-light">
              {formTitle || "Add New Inventory Item"}
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
              onSubmit={handleSubmitInventoryItem}
              noValidate
            >
              <TextField
                label="Item Name"
                placeholder="e.g. Premium Arabica Beans"
                value={inventoryItem.itemName}
                onChange={(val: string) => {
                  setInventoryItem({ ...inventoryItem, itemName: val });
                  setInventoryErrors({
                    ...inventoryErrors,
                    itemName: undefined,
                  });
                }}
                type={inventoryErrors.itemName ? "error" : ""}
                errorMessage={inventoryErrors.itemName}
              />

              {inventoryItem.itemName.trim().length > 0 && (
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <input
                    type="checkbox"
                    id="feedCheckbox"
                    checked={inventoryItem.feed}
                    onChange={(e) =>
                      setInventoryItem({
                        ...inventoryItem,
                        feed: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 bg-gray-100 dark:bg-gray-700"
                  />
                  <label
                    htmlFor="feedCheckbox"
                    className="text-sm font-medium text-dark dark:text-light"
                  >
                    Is it a Feed ?
                  </label>
                </div>
              )}

              <div className="relative">
                <TextField
                  label="Item Occupation"
                  placeholder="e.g. Raw Coffee, Packaging"
                  value={inventoryItem.itemGroup}
                  onChange={handleItemCategoryInputChange}
                  onFocus={handleItemCategoryInputFocus}
                  isLoading={isLoadingSubTypes}
                  type={inventoryErrors.itemGroup ? "error" : ""}
                  errorMessage={inventoryErrors.itemGroup}
                />
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-20 mt-1 w-full bg-light dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {isLoadingSubTypes ? (
                      <div className="p-3 flex justify-center items-center">
                        <Loader />
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-700 text-sm cursor-pointer text-dark dark:text-light"
                          onClick={() => selectCategorySuggestion(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No categories found.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DropdownLarge
                items={UNITS}
                selectedItem={inventoryItem.units}
                onSelect={(value: string) => {
                  setInventoryItem({ ...inventoryItem, units: value });
                  setInventoryErrors({ ...inventoryErrors, units: undefined });
                }}
                type="form"
                label="Units"
                width="full"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  number
                  label="Quantity"
                  placeholder="e.g. 100"
                  value={inventoryItem.quantity}
                  onChange={(val: string) => {
                    setInventoryItem({ ...inventoryItem, quantity: val });
                    setInventoryErrors({
                      ...inventoryErrors,
                      quantity: undefined,
                    });
                  }}
                  type={inventoryErrors.quantity ? "error" : ""}
                  errorMessage={inventoryErrors.quantity}
                />
                <TextField
                  number
                  label="Price Per Unit"
                  placeholder="e.g. 25.50"
                  value={inventoryItem.pricePerUnit}
                  onChange={(val: string) => {
                    setInventoryItem({ ...inventoryItem, pricePerUnit: val });
                    setInventoryErrors({
                      ...inventoryErrors,
                      pricePerUnit: undefined,
                    });
                  }}
                  type={inventoryErrors.pricePerUnit ? "error" : ""}
                  errorMessage={inventoryErrors.pricePerUnit}
                />
              </div>
              <TextField
                number
                label="Minimum Stock Limit (Optional)"
                placeholder="e.g. 10"
                value={inventoryItem.minimumLimit}
                onChange={(val: string) => {
                  setInventoryItem({ ...inventoryItem, minimumLimit: val });
                  setInventoryErrors({
                    ...inventoryErrors,
                    minimumLimit: undefined,
                  });
                }}
                type={inventoryErrors.minimumLimit ? "error" : ""}
                errorMessage={inventoryErrors.minimumLimit}
              />

              <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                <Button text="Cancel" style="secondary" onClick={handleClose} />
                <Button text="Add Item" style="primary" type="submit" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryForm;
