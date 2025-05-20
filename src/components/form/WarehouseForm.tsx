import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import axios from "axios"; // Added for isAxiosError

const WAREHOUSE_TYPES = [
  "Ambient Storage",
  "Cold Storage",
  "Climate Controlled Storage",
  "Bulk Silo Storage",
  "Packhouse",
  "Hazardous Storage",
];

type WarehouseData = {
  name: string;
  type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  contact_person: string;
  phone: string;
  storage_capacity: string;
};

type WarehouseFormErrors = {
  name?: string;
  type?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  storage_capacity?: string;
};

interface WarehouseFormProps extends SidebarProp {
  initialData?: Partial<WarehouseData>;
  warehouseId?: number;
}

const WarehouseForm = ({
  onClose,
  formTitle,
  initialData,
  warehouseId,
}: WarehouseFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({
    name: initialData?.name || "",
    type: initialData?.type || "",
    address_line_1: initialData?.address_line_1 || "",
    address_line_2: initialData?.address_line_2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    postal_code: initialData?.postal_code || "",
    country: initialData?.country || "",
    contact_person: initialData?.contact_person || "",
    phone: initialData?.phone || "",
    storage_capacity: initialData?.storage_capacity?.toString() || "",
  });
  const [warehouseErrors, setWarehouseErrors] = useState<WarehouseFormErrors>(
    {}
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const isEditMode = !!warehouseId;

  useAnimatePanel(setAnimate);

  const handleCloseAnimation = () => {
    setAnimate(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClose = () => {
    handleCloseAnimation();
  };

  useClickOutside(panelRef, handleClose);

  useEffect(() => {
    if (initialData) {
      setWarehouseData({
        name: initialData.name || "",
        type: initialData.type || "",
        address_line_1: initialData.address_line_1 || "",
        address_line_2: initialData.address_line_2 || "",
        city: initialData.city || "",
        state: initialData.state || "",
        postal_code: initialData.postal_code || "",
        country: initialData.country || "",
        contact_person: initialData.contact_person || "",
        phone: initialData.phone || "",
        storage_capacity: initialData.storage_capacity?.toString() || "",
      });
      setWarehouseErrors({}); // Clear errors when initialData changes
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const errors: WarehouseFormErrors = {};
    let isValid = true;

    if (!warehouseData.name.trim()) {
      errors.name = "Warehouse Name is required.";
      isValid = false;
    }
    if (!warehouseData.type) {
      errors.type = "Warehouse Type is required.";
      isValid = false;
    }
    if (!warehouseData.address_line_1.trim()) {
      errors.address_line_1 = "Address Line 1 is required.";
      isValid = false;
    }
    if (!warehouseData.city.trim()) {
      errors.city = "City is required.";
      isValid = false;
    }
    if (!warehouseData.state.trim()) {
      errors.state = "State / Province is required.";
      isValid = false;
    }
    if (!warehouseData.postal_code.trim()) {
      errors.postal_code = "Postal Code is required.";
      isValid = false;
    }
    if (!warehouseData.country.trim()) {
      errors.country = "Country is required.";
      isValid = false;
    }
    if (
      warehouseData.storage_capacity &&
      isNaN(parseFloat(warehouseData.storage_capacity))
    ) {
      errors.storage_capacity = "Storage capacity must be a valid number.";
      isValid = false;
    }
    // Basic phone validation (optional)
    // if (warehouseData.phone && !/^\+?[1-9]\d{1,14}$/.test(warehouseData.phone)) {
    //   errors.phone = "Phone number format is not valid.";
    //   isValid = false;
    // }

    setWarehouseErrors(errors);
    return isValid;
  };

  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      user_id: parsedUserId ? Number(parsedUserId) : undefined,
      name: warehouseData.name,
      type: warehouseData.type,
      address_line_1: warehouseData.address_line_1 || undefined,
      address_line_2: warehouseData.address_line_2 || undefined,
      city: warehouseData.city || undefined,
      state: warehouseData.state || undefined,
      postal_code: warehouseData.postal_code || undefined,
      country: warehouseData.country || undefined,
      contact_person: warehouseData.contact_person || undefined,
      phone: warehouseData.phone || undefined,
      storage_capacity: warehouseData.storage_capacity
        ? parseFloat(warehouseData.storage_capacity)
        : undefined,
    };

    try {
      if (isEditMode && warehouseId) {
        await axiosInstance.put(`/warehouse/update/${warehouseId}`, payload);
      } else {
        if (!parsedUserId) {
          alert("User ID is missing. Cannot create warehouse.");
          return;
        }
        await axiosInstance.post(`/warehouse/add`, payload);
      }
      handleClose();
      window.location.reload(); // Or a more granular state update if preferred
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : error instanceof Error
          ? error.message
          : "An unexpected error occurred";
      alert(
        `Error ${isEditMode ? "updating" : "adding"} warehouse: ${message}`
      );
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
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-dark dark:text-light">
              {formTitle ||
                (isEditMode ? "Edit Warehouse" : "Create Warehouse")}
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={handleSubmitWarehouse}
              noValidate
            >
              <TextField
                label="Warehouse Name"
                placeholder="e.g. Main Storage Facility"
                value={warehouseData.name}
                onChange={(val: string) =>
                  setWarehouseData({ ...warehouseData, name: val })
                }
                type={warehouseErrors.name ? "error" : ""}
                errorMessage={warehouseErrors.name}
              />

              <DropdownLarge
                items={WAREHOUSE_TYPES}
                selectedItem={warehouseData.type}
                onSelect={(value: string) =>
                  setWarehouseData({ ...warehouseData, type: value })
                }
                type="form"
                label="Warehouse Type"
                width="full"
              />

              <TextField
                label="Address Line 1"
                placeholder="e.g. 123 Industrial Park Rd"
                value={warehouseData.address_line_1}
                onChange={(val: string) =>
                  setWarehouseData({ ...warehouseData, address_line_1: val })
                }
                type={warehouseErrors.address_line_1 ? "error" : ""}
                errorMessage={warehouseErrors.address_line_1}
              />

              <TextField
                label="Address Line 2 (Optional)"
                placeholder="e.g. Suite 100"
                value={warehouseData.address_line_2}
                onChange={(val: string) =>
                  setWarehouseData({ ...warehouseData, address_line_2: val })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="City"
                  placeholder="e.g. Springfield"
                  value={warehouseData.city}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, city: val })
                  }
                  type={warehouseErrors.city ? "error" : ""}
                  errorMessage={warehouseErrors.city}
                />

                <TextField
                  label="State / Province"
                  placeholder="e.g. Illinois"
                  value={warehouseData.state}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, state: val })
                  }
                  type={warehouseErrors.state ? "error" : ""}
                  errorMessage={warehouseErrors.state}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Postal Code"
                  placeholder="e.g. 62701"
                  value={warehouseData.postal_code}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, postal_code: val })
                  }
                  type={warehouseErrors.postal_code ? "error" : ""}
                  errorMessage={warehouseErrors.postal_code}
                />
                <TextField
                  label="Country"
                  placeholder="e.g. USA"
                  value={warehouseData.country}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, country: val })
                  }
                  type={warehouseErrors.country ? "error" : ""}
                  errorMessage={warehouseErrors.country}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Contact Person (Optional)"
                  placeholder="e.g. John Doe"
                  value={warehouseData.contact_person}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, contact_person: val })
                  }
                />
                <TextField
                  label="Phone Number (Optional)"
                  placeholder="e.g. (555) 123-4567"
                  value={warehouseData.phone}
                  onChange={(val: string) =>
                    setWarehouseData({ ...warehouseData, phone: val })
                  }
                  type={warehouseErrors.phone ? "error" : ""}
                  errorMessage={warehouseErrors.phone}
                />
              </div>

              <TextField
                number // Assuming this prop primarily affects appearance or internal input type
                label="Storage Capacity (Optional)"
                placeholder="e.g. 10000.50 (numeric)"
                value={warehouseData.storage_capacity}
                onChange={(val: string) =>
                  setWarehouseData({ ...warehouseData, storage_capacity: val })
                }
                type={warehouseErrors.storage_capacity ? "error" : ""}
                errorMessage={warehouseErrors.storage_capacity}
              />

              <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button text="Cancel" style="secondary" onClick={handleClose} />
                <Button
                  text={isEditMode ? "Update Warehouse" : "Create Warehouse"}
                  style="primary"
                  type="submit"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseForm;
