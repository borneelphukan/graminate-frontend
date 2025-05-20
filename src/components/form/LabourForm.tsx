import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { GENDER } from "@/constants/options";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";
import axios from "axios";

const LabourForm = ({ onClose, formTitle }: SidebarProp) => {
  const router = useRouter();
  const { user_id } = router.query;

  const [labourValues, setLabourValues] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    role: "",
    contactNumber: "",
    aadharCardNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    baseSalary: "",
    bonus: "",
    overtimePay: "",
    housingAllowance: "",
    travelAllowance: "",
    mealAllowance: "",
    paymentFrequency: "Monthly",
  });

  const [labourErrors, setLabourErrors] = useState({
    contactNumber: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    baseSalary: "",
  });

  const [animate, setAnimate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useAnimatePanel(setAnimate);

  useClickOutside(panelRef, () => {
    setAnimate(false);
    setTimeout(() => handleClose(), 300);
  });

  const handleCloseAnimation = () => {
    setAnimate(false);
    setTimeout(() => onClose(), 300);
  };

  const handleClose = () => {
    handleCloseAnimation();
  };

  const isValidE164 = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  };

  const validateLabourAddress = () => {
    const errors = {
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
    };
    let isValid = true;

    if (!labourValues.addressLine1.trim()) {
      errors.addressLine1 = "Address Line 1 is required.";
      isValid = false;
    }
    if (!labourValues.city.trim()) {
      errors.city = "City is required.";
      isValid = false;
    }
    if (!labourValues.state.trim()) {
      errors.state = "State is required.";
      isValid = false;
    }
    if (!labourValues.postalCode.trim()) {
      errors.postalCode = "Postal Code is required.";
      isValid = false;
    }

    return { errors, isValid };
  };

  const validateSalaryFields = () => {
    const errors = {
      baseSalary: "",
    };
    let isValid = true;

    if (labourValues.baseSalary && isNaN(Number(labourValues.baseSalary))) {
      errors.baseSalary = "Base salary must be a number";
      isValid = false;
    }

    return { errors, isValid };
  };

  const handleSubmitLabour = async (e: React.FormEvent) => {
    e.preventDefault();

    const addressValidation = validateLabourAddress();
    const salaryValidation = validateSalaryFields();
    const phoneValid =
      isValidE164(labourValues.contactNumber) || !labourValues.contactNumber;
    const phoneErrorMsg = !phoneValid ? "Phone number is not valid" : "";

    setLabourErrors({
      ...labourErrors,
      ...addressValidation.errors,
      ...salaryValidation.errors,
      contactNumber: phoneErrorMsg,
    });

    if (
      !addressValidation.isValid ||
      !phoneValid ||
      !salaryValidation.isValid
    ) {
      console.log("Labour form validation failed:", {
        ...addressValidation.errors,
        ...salaryValidation.errors,
        contactNumber: phoneErrorMsg,
      });
      return;
    }

    const payload = {
      user_id: user_id,
      full_name: labourValues.fullName,
      date_of_birth: labourValues.dateOfBirth,
      gender: labourValues.gender,
      role: labourValues.role,
      contact_number: labourValues.contactNumber,
      aadhar_card_number: labourValues.aadharCardNumber,
      address_line_1: labourValues.addressLine1,
      address_line_2: labourValues.addressLine2,
      city: labourValues.city,
      state: labourValues.state,
      postal_code: labourValues.postalCode,
      // Salary fields
      base_salary: labourValues.baseSalary
        ? parseFloat(labourValues.baseSalary)
        : 0,
      bonus: labourValues.bonus ? parseFloat(labourValues.bonus) : 0,
      overtime_pay: labourValues.overtimePay
        ? parseFloat(labourValues.overtimePay)
        : 0,
      housing_allowance: labourValues.housingAllowance
        ? parseFloat(labourValues.housingAllowance)
        : 0,
      travel_allowance: labourValues.travelAllowance
        ? parseFloat(labourValues.travelAllowance)
        : 0,
      meal_allowance: labourValues.mealAllowance
        ? parseFloat(labourValues.mealAllowance)
        : 0,
      payment_frequency: labourValues.paymentFrequency,
    };

    try {
      await axiosInstance.post(`/labour/add`, payload);
      setLabourValues({
        fullName: "",
        dateOfBirth: "",
        gender: "",
        role: "",
        contactNumber: "",
        aadharCardNumber: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        baseSalary: "",
        bonus: "",
        overtimePay: "",
        housingAllowance: "",
        travelAllowance: "",
        mealAllowance: "",
        paymentFrequency: "Monthly",
      });
      setLabourErrors({
        contactNumber: "",
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        baseSalary: "",
      });
      handleClose();
      window.location.reload();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : error instanceof Error
          ? error.message
          : "An unexpected error occurred";
      console.error("Error adding labour:", message);
      alert(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-light dark:bg-gray-800 shadow-lg dark:border-l border-gray-700 overflow-y-auto"
        style={{
          transform: animate ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-dark dark:text-light">
              {formTitle ? formTitle : "Add New Labour"}
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faX} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={handleSubmitLabour}
              noValidate
            >
              <TextField
                label="Full Name"
                placeholder="e.g. John Doe"
                value={labourValues.fullName}
                onChange={(val: string) =>
                  setLabourValues({ ...labourValues, fullName: val })
                }
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <TextField
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  value={labourValues.dateOfBirth}
                  onChange={(val: string) =>
                    setLabourValues({ ...labourValues, dateOfBirth: val })
                  }
                  calendar
                />
                <TextField
                  label="Designation / Role"
                  placeholder="Role of the Employee"
                  value={labourValues.role}
                  onChange={(val: string) =>
                    setLabourValues({ ...labourValues, role: val })
                  }
                />
              </div>
              <DropdownLarge
                items={GENDER}
                selectedItem={labourValues.gender}
                onSelect={(value: string) =>
                  setLabourValues({ ...labourValues, gender: value })
                }
                type="form"
                label="Gender"
                width="full"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <TextField
                  label="Contact Number"
                  placeholder="e.g. +91XXXXXXXXXX"
                  value={labourValues.contactNumber}
                  onChange={(val: string) => {
                    setLabourValues({ ...labourValues, contactNumber: val });
                    if (val && !isValidE164(val)) {
                      setLabourErrors({
                        ...labourErrors,
                        contactNumber:
                          "Phone number format is not valid (e.g., +919876543210)",
                      });
                    } else {
                      setLabourErrors({ ...labourErrors, contactNumber: "" });
                    }
                  }}
                  type={labourErrors.contactNumber ? "error" : ""}
                  errorMessage={labourErrors.contactNumber}
                />
                <TextField
                  label="Aadhar Card Number"
                  placeholder="e.g. XXXX XXXX XXXX"
                  value={labourValues.aadharCardNumber}
                  onChange={(val: string) =>
                    setLabourValues({ ...labourValues, aadharCardNumber: val })
                  }
                />
              </div>
              <TextField
                label="Address Line 1"
                placeholder="e.g. House No, Street Name"
                value={labourValues.addressLine1}
                onChange={(val: string) =>
                  setLabourValues({ ...labourValues, addressLine1: val })
                }
                type={labourErrors.addressLine1 ? "error" : ""}
                errorMessage={labourErrors.addressLine1}
              />
              <TextField
                label="Address Line 2 (Optional)"
                placeholder="e.g. Landmark, Apartment Name"
                value={labourValues.addressLine2}
                onChange={(val: string) =>
                  setLabourValues({ ...labourValues, addressLine2: val })
                }
              />
              <TextField
                label="City"
                placeholder="e.g. Mumbai"
                value={labourValues.city}
                onChange={(val: string) =>
                  setLabourValues({ ...labourValues, city: val })
                }
                type={labourErrors.city ? "error" : ""}
                errorMessage={labourErrors.city}
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <TextField
                  label="State"
                  placeholder="e.g. Maharashtra"
                  value={labourValues.state}
                  onChange={(val: string) =>
                    setLabourValues({ ...labourValues, state: val })
                  }
                  type={labourErrors.state ? "error" : ""}
                  errorMessage={labourErrors.state}
                />
                <TextField
                  label="Postal Code"
                  placeholder="e.g. 400001"
                  value={labourValues.postalCode}
                  onChange={(val: string) =>
                    setLabourValues({ ...labourValues, postalCode: val })
                  }
                  type={labourErrors.postalCode ? "error" : ""}
                  errorMessage={labourErrors.postalCode}
                />
              </div>

              {/* Salary Section */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">
                  Salary Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="Base Salary (₹)"
                    placeholder=""
                    value={labourValues.baseSalary}
                    onChange={(val: string) => {
                      setLabourValues({ ...labourValues, baseSalary: val });
                      if (val && isNaN(Number(val))) {
                        setLabourErrors({
                          ...labourErrors,
                          baseSalary: "Must be a valid number",
                        });
                      } else {
                        setLabourErrors({ ...labourErrors, baseSalary: "" });
                      }
                    }}
                    type={labourErrors.baseSalary ? "error" : ""}
                    errorMessage={labourErrors.baseSalary}
                  />
                  <DropdownLarge
                    items={["Monthly", "Weekly", "Bi-weekly", "Daily"]}
                    selectedItem={labourValues.paymentFrequency}
                    onSelect={(value: string) =>
                      setLabourValues({
                        ...labourValues,
                        paymentFrequency: value,
                      })
                    }
                    type="form"
                    label="Payment Frequency"
                    width="full"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <TextField
                    label="Bonus (₹)"
                    placeholder="e.g. 1000"
                    value={labourValues.bonus}
                    onChange={(val: string) =>
                      setLabourValues({ ...labourValues, bonus: val })
                    }
                  />
                  <TextField
                    label="Overtime Pay (₹)"
                    placeholder="e.g. 500"
                    value={labourValues.overtimePay}
                    onChange={(val: string) =>
                      setLabourValues({ ...labourValues, overtimePay: val })
                    }
                  />
                  <TextField
                    label="Housing Allowance (₹)"
                    placeholder="e.g. 2000"
                    value={labourValues.housingAllowance}
                    onChange={(val: string) =>
                      setLabourValues({
                        ...labourValues,
                        housingAllowance: val,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <TextField
                    label="Travel Allowance (₹)"
                    placeholder="e.g. 1000"
                    value={labourValues.travelAllowance}
                    onChange={(val: string) =>
                      setLabourValues({ ...labourValues, travelAllowance: val })
                    }
                  />
                  <TextField
                    label="Meal Allowance (₹)"
                    placeholder="e.g. 800"
                    value={labourValues.mealAllowance}
                    onChange={(val: string) =>
                      setLabourValues({ ...labourValues, mealAllowance: val })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button text="Cancel" style="secondary" onClick={handleClose} />
                <Button text="Add Labour" style="primary" type="submit" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabourForm;
