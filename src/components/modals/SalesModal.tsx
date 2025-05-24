import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "../ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/ui/Loader";
import { UNITS } from "@/constants/options";

type SalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string | undefined;
  onSaleAdded: () => void;
};

type SoldItem = {
  name: string;
  quantity: string;
  unit: string;
  price_per_unit: string;
};

const SalesModal = ({
  isOpen,
  onClose,
  userId,
  onSaleAdded,
}: SalesModalProps) => {
  const [salesName, setSalesName] = useState("");
  const [salesDate, setSalesDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [occupation, setOccupation] = useState("");
  const [items, setItems] = useState<SoldItem[]>([
    { name: "", quantity: "", unit: "", price_per_unit: "" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);

  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [showUnitSuggestionsFor, setShowUnitSuggestionsFor] = useState<
    number | null
  >(null);
  const unitSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        unitSuggestionsRef.current &&
        !unitSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowUnitSuggestionsFor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      if (!userId) {
        setIsLoadingSubTypes(false);
        setSubTypes([]);
        return;
      }
      setIsLoadingSubTypes(true);
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const user = response.data?.data?.user ?? response.data?.user;
        if (user && user.sub_type) {
          const fetchedSubTypes = Array.isArray(user.sub_type)
            ? user.sub_type
            : typeof user.sub_type === "string"
            ? user.sub_type.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
          setSubTypes(fetchedSubTypes);
        } else {
          setSubTypes([]);
        }
      } catch (err) {
        console.error("Error fetching user sub_types:", err);
        setSubTypes([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };

    if (isOpen) {
      fetchUserSubTypes();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      setSalesName("");
      setSalesDate(new Date().toISOString().split("T")[0]);
      setOccupation("");
      setItems([{ name: "", quantity: "", unit: "", price_per_unit: "" }]);
      setErrors({});
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!salesDate) newErrors.salesDate = "Sales date is required.";
    if (!userId) newErrors.general = "User ID is missing.";
    if (items.some((item) => !item.name.trim()))
      newErrors.itemsName = "All item names are required.";
    if (
      items.some((item) => !item.quantity.trim() || Number(item.quantity) <= 0)
    )
      newErrors.itemsQuantity = "All item quantities must be greater than 0.";
    if (items.some((item) => !item.unit.trim()))
      newErrors.itemsUnit = "Unit for each item is required.";
    if (
      items.some(
        (item) =>
          !item.price_per_unit.trim() || Number(item.price_per_unit) <= 0
      )
    )
      newErrors.itemsPrice =
        "Price per unit for each item must be greater than 0.";
    if (items.length === 0)
      newErrors.itemsGeneral = "At least one item is required.";

    setErrors(newErrors); // Update to set individual item errors or a general one
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { name: "", quantity: "", unit: "", price_per_unit: "" },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (
    index: number,
    field: "name" | "quantity" | "unit" | "price_per_unit",
    value: string
  ) => {
    const newItems = [...items];
    if (field === "name") {
      newItems[index].name = value;
    } else if (field === "quantity") {
      newItems[index].quantity =
        value === "" ? "" : value.replace(/[^0-9]/g, "");
    } else if (field === "unit") {
      newItems[index].unit = value;
      if (value.length > 0) {
        const filtered = UNITS.filter((unit) =>
          unit.toLowerCase().includes(value.toLowerCase())
        );
        setUnitSuggestions(filtered);
        setShowUnitSuggestionsFor(index);
      } else {
        setUnitSuggestions(UNITS);
        setShowUnitSuggestionsFor(index);
      }
    } else if (field === "price_per_unit") {
      // Allow decimal for price
      newItems[index].price_per_unit =
        value === "" ? "" : value.replace(/[^0-9.]/g, "");
    }
    setItems(newItems);
  };

  const selectUnitSuggestion = (index: number, suggestion: string) => {
    const newItems = [...items];
    newItems[index].unit = suggestion;
    setItems(newItems);
    setShowUnitSuggestionsFor(null);
  };

  const handleUnitInputFocus = (index: number) => {
    setUnitSuggestions(
      items[index].unit
        ? UNITS.filter((u) =>
            u.toLowerCase().includes(items[index].unit.toLowerCase())
          )
        : UNITS
    );
    setShowUnitSuggestionsFor(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!userId) {
      Swal.fire("Error", "User ID is not available.", "error");
      return;
    }

    setIsLoading(true);

    const finalQuantityUnit =
      items.length > 0 && items[0].unit ? items[0].unit : undefined;

    const finalSaleData = {
      user_id: Number(userId),
      sales_name: salesName.trim() || undefined,
      sales_date: salesDate,
      occupation: occupation || undefined,
      items_sold: items.map((item) => item.name),
      quantities_sold: items.map((item) => Number(item.quantity)),
      prices_per_unit: items.map((item) => Number(item.price_per_unit)), // Add prices
      quantity_unit: finalQuantityUnit, // This might need to be an array if each item has its own unit in DB
    };

    try {
      await axiosInstance.post("/sales/add", finalSaleData);
      onSaleAdded();
    } catch (error: any) {
      console.error("Failed to log sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to log sale. Please try again.";
      Swal.fire("Error", errorMessage, "error");
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (typeof backendErrors === "object" && backendErrors !== null) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-400">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Log New Sale
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Sales Title"
              placeholder="e.g., Weekly Farm Stand Sales"
              value={salesName}
              onChange={(val) => setSalesName(val)}
              width="large"
            />
            <TextField
              label="Sales Date"
              calendar={true}
              value={salesDate}
              onChange={(val) => setSalesDate(val)}
              errorMessage={errors.salesDate}
              type={errors.salesDate ? "error" : ""}
              width="large"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {isLoadingSubTypes ? (
              <div className="flex flex-col">
                <div className="p-2.5 border border-gray-400 dark:border-gray-200 rounded-md flex items-center justify-center h-[42px]">
                  <Loader />
                </div>
              </div>
            ) : (
              <DropdownSmall
                label="Sale Occupation"
                items={
                  subTypes.length > 0
                    ? subTypes
                    : ["N/A - No occupations found"]
                }
                selected={occupation}
                onSelect={(val) =>
                  setOccupation(val === "N/A - No occupations found" ? "" : val)
                }
                placeholder="Select an occupation"
              />
            )}
          </div>
          {errors.occupation && !isLoadingSubTypes && subTypes.length > 0 && (
            <p className="text-red-200 text-xs -mt-4 mb-2">
              {errors.occupation}
            </p>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Items Sold
            </label>
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-3 gap-y-2 items-end mb-3"
              >
                <TextField
                  label="Item Name"
                  placeholder="e.g., Organic Eggs"
                  value={item.name}
                  onChange={(val) => handleItemChange(index, "name", val)}
                />

                <TextField
                  label="Quantity Sold"
                  number={true}
                  placeholder="e.g., 12"
                  value={item.quantity}
                  onChange={(val) => handleItemChange(index, "quantity", val)}
                />
                <TextField
                  label={index === 0 ? "Price/Unit" : undefined}
                  number={true}
                  placeholder="e.g., 4.50"
                  value={item.price_per_unit}
                  onChange={(val) =>
                    handleItemChange(index, "price_per_unit", val)
                  }
                />
                <div className="relative">
                  <TextField
                    label="Measurement Unit"
                    placeholder="e.g., dozen"
                    value={item.unit}
                    onChange={(val) => handleItemChange(index, "unit", val)}
                    onFocus={() => handleUnitInputFocus(index)}
                  />
                  {showUnitSuggestionsFor === index &&
                    unitSuggestions.length > 0 && (
                      <div
                        ref={unitSuggestionsRef}
                        className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-32 overflow-auto"
                      >
                        {unitSuggestions.map((suggestion, sIndex) => (
                          <div
                            key={sIndex}
                            className="px-3 py-1.5 hover:bg-gray-500 dark:hover:bg-gray-600 text-sm cursor-pointer"
                            onClick={() =>
                              selectUnitSuggestion(index, suggestion)
                            }
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {items.length > 1 && (
                  <div className={index === 0 ? "pt-[21px] sm:pt-0" : ""}>
                    <Button
                      type="button"
                      style="delete"
                      onClick={() => handleRemoveItem(index)}
                      aria-label="Remove item"
                      text="Del"
                    />
                  </div>
                )}
              </div>
            ))}
            {(errors.itemsName ||
              errors.itemsQuantity ||
              errors.itemsUnit ||
              errors.itemsPrice ||
              errors.itemsGeneral) && (
              <p className="text-red-200 text-xs mt-1">
                {errors.itemsName ||
                  errors.itemsQuantity ||
                  errors.itemsUnit ||
                  errors.itemsPrice ||
                  errors.itemsGeneral ||
                  "Please check item details."}
              </p>
            )}
            <Button
              type="button"
              style="secondary"
              onClick={handleAddItem}
              text="Add Item"
            />
          </div>

          {errors.general && (
            <p className="text-red-200 text-sm">{errors.general}</p>
          )}

          <div className="flex justify-end gap-4 pt-6 mt-8 border-t border-gray-400">
            <Button
              text="Cancel"
              type="button"
              style="secondary"
              onClick={onClose}
              isDisabled={isLoading || isLoadingSubTypes}
            />
            <Button
              text={isLoading || isLoadingSubTypes ? "Logging..." : "Log Sale"}
              type="submit"
              style="primary"
              isDisabled={isLoading || isLoadingSubTypes}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesModal;
