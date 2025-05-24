import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "../ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/ui/Loader";

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
};

const SalesModal = ({
  isOpen,
  onClose,
  userId,
  onSaleAdded,
}: SalesModalProps) => {
  const [salesName, setSalesName] = useState(""); // Added salesName state
  const [salesDate, setSalesDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [occupation, setOccupation] = useState("");
  const [items, setItems] = useState<SoldItem[]>([
    { name: "", quantity: "", unit: "" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);

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
      setSalesName(""); // Reset salesName
      setSalesDate(new Date().toISOString().split("T")[0]);
      setOccupation("");
      setItems([{ name: "", quantity: "", unit: "" }]);
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
    // salesName is optional, so no validation here unless you make it required
    if (!userId) newErrors.general = "User ID is missing.";
    if (items.some((item) => !item.name.trim()))
      newErrors.items = "All item names are required.";
    if (
      items.some((item) => !item.quantity.trim() || Number(item.quantity) <= 0)
    )
      newErrors.items = "All item quantities must be greater than 0.";
    if (items.some((item) => !item.unit.trim()))
      newErrors.items = "Unit for each item is required.";
    if (items.length === 0) newErrors.items = "At least one item is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", quantity: "", unit: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (
    index: number,
    field: "name" | "quantity" | "unit",
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
    }
    setItems(newItems);
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
      sales_name: salesName.trim() || undefined, // Add salesName
      sales_date: salesDate,
      occupation: occupation || undefined,
      items_sold: items.map((item) => item.name),
      quantities_sold: items.map((item) => Number(item.quantity)),
      quantity_unit: finalQuantityUnit,
    };

    try {
      await axiosInstance.post("/sales/add", finalSaleData);
      Swal.fire("Success", "Sale logged successfully!", "success");
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
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl">
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
              placeholder="e.g., Sale made today"
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
                <label className="block mb-1 text-sm font-medium text-dark dark:text-gray-300">
                  Log Sale for (Occupation)
                </label>
                <div className="p-2.5 border border-gray-400 dark:border-gray-200 rounded-md flex items-center justify-center h-[42px]">
                  <Loader />
                </div>
              </div>
            ) : (
              <DropdownSmall
                label="Log Sale for (Occupation)"
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
            <p className="text-red-500 text-xs -mt-4 mb-2">
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
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 items-end mb-3 py-3 rounded-md"
              >
                <TextField
                  label={index === 0 ? "Item Name" : undefined}
                  placeholder="e.g., Eggs, Milk"
                  value={item.name}
                  onChange={(val) => handleItemChange(index, "name", val)}
                  width="large"
                />
                <div className="grid grid-cols-2 gap-x-2">
                  <TextField
                    label={index === 0 ? "Quantity" : undefined}
                    number={true}
                    placeholder="e.g., 12"
                    value={item.quantity}
                    onChange={(val) => handleItemChange(index, "quantity", val)}
                    width="large"
                  />
                  <TextField
                    label={index === 0 ? "Unit" : undefined}
                    placeholder="e.g., dozen"
                    value={item.unit}
                    onChange={(val) => handleItemChange(index, "unit", val)}
                    width="large"
                  />
                </div>

                {items.length > 1 && (
                  <div className={index === 0 ? "mt-[21px]" : "sm:mt-0"}>
                    <Button
                      type="button"
                      style="delete"
                      onClick={() => handleRemoveItem(index)}
                      aria-label="Remove item"
                      text="Delete"
                    />
                  </div>
                )}
              </div>
            ))}
            {errors.items && (
              <p className="text-red-500 text-xs mt-1">{errors.items}</p>
            )}
            <Button
              type="button"
              style="secondary"
              onClick={handleAddItem}
              text="Add Item"
            />
          </div>

          {errors.general && (
            <p className="text-red-500 text-sm">{errors.general}</p>
          )}

          <div className="flex justify-end gap-4 pt-6 mt-8">
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
