import React, { useState } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { CONTACT_TYPES } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type ContactFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const isValidE164 = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone);

const ContactForm = ({ userId, onClose }: ContactFormProps) => {
  const [contactValues, setContactValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [contactErrors, setContactErrors] = useState({
    phoneNumber: "",
    address_line_1: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const validateContactAddress = () => {
    const errors = { address_line_1: "", city: "", state: "", postal_code: "" };
    let isValid = true;
    if (!contactValues.address_line_1.trim()) {
      errors.address_line_1 = "Address Line 1 is required.";
      isValid = false;
    }
    if (!contactValues.city.trim()) {
      errors.city = "City is required.";
      isValid = false;
    }
    if (!contactValues.state.trim()) {
      errors.state = "State is required.";
      isValid = false;
    }
    if (!contactValues.postal_code.trim()) {
      errors.postal_code = "Postal Code is required.";
      isValid = false;
    }
    return { errors, isValid };
  };

  const handleSubmitContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    const addressValidation = validateContactAddress();
    const phoneValid =
      isValidE164(contactValues.phoneNumber) || !contactValues.phoneNumber;
    const phoneErrorMsg = !phoneValid ? "Phone number is not valid" : "";
    setContactErrors({
      ...contactErrors,
      ...addressValidation.errors,
      phoneNumber: phoneErrorMsg,
    });
    if (!addressValidation.isValid || !phoneValid) {
      triggerToast("Please correct the errors in the form.", "error");
      return;
    }
    const payload = {
      user_id: userId,
      first_name: contactValues.firstName,
      last_name: contactValues.lastName,
      email: contactValues.email,
      phone_number: contactValues.phoneNumber,
      type: contactValues.type,
      address_line_1: contactValues.address_line_1,
      address_line_2: contactValues.address_line_2,
      city: contactValues.city,
      state: contactValues.state,
      postal_code: contactValues.postal_code,
    };
    try {
      await axiosInstance.post("/contacts/add", payload);
      setContactValues({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        type: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        postal_code: "",
      });
      setContactErrors({
        phoneNumber: "",
        address_line_1: "",
        city: "",
        state: "",
        postal_code: "",
      });
      triggerToast("Contact added successfully!", "success");
      onClose();
      window.location.reload();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "An unexpected error occurred";
      triggerToast(`Error: ${message}`, "error");
    }
  };

  return (
    <form
      className="flex flex-col gap-4 w-full"
      onSubmit={handleSubmitContacts}
      noValidate
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <TextField
          label="First Name"
          placeholder="e.g. John"
          value={contactValues.firstName}
          onChange={(val: string) =>
            setContactValues({ ...contactValues, firstName: val })
          }
        />
        <TextField
          label="Last Name"
          placeholder="e.g. Doe"
          value={contactValues.lastName}
          onChange={(val: string) =>
            setContactValues({ ...contactValues, lastName: val })
          }
        />
      </div>
      <TextField
        label="Email"
        placeholder="e.g. john.doe@gmail.com"
        value={contactValues.email}
        onChange={(val: string) =>
          setContactValues({ ...contactValues, email: val })
        }
      />
      <TextField
        label="Phone Number"
        placeholder="eg. +91 XXXXX XXXXX"
        value={contactValues.phoneNumber}
        onChange={(val: string) => {
          setContactValues({ ...contactValues, phoneNumber: val });
          if (val && !isValidE164(val)) {
            setContactErrors({
              ...contactErrors,
              phoneNumber: "Contact number not valid",
            });
          } else {
            setContactErrors({ ...contactErrors, phoneNumber: "" });
          }
        }}
        type={contactErrors.phoneNumber ? "error" : ""}
        errorMessage={contactErrors.phoneNumber}
      />
      <DropdownLarge
        items={CONTACT_TYPES}
        selectedItem={contactValues.type}
        onSelect={(value: string) =>
          setContactValues({ ...contactValues, type: value })
        }
        type="form"
        label="Type"
        width="full"
      />
      <TextField
        label="Address Line 1"
        placeholder="e.g. Flat No. 203, Building C"
        value={contactValues.address_line_1}
        onChange={(val: string) =>
          setContactValues({ ...contactValues, address_line_1: val })
        }
        type={contactErrors.address_line_1 ? "error" : ""}
        errorMessage={contactErrors.address_line_1}
      />
      <TextField
        label="Address Line 2 (Optional)"
        placeholder="e.g. Green View Apartments, 5th Cross"
        value={contactValues.address_line_2}
        onChange={(val: string) =>
          setContactValues({ ...contactValues, address_line_2: val })
        }
      />
      <TextField
        label="City"
        placeholder="e.g. Bengaluru"
        value={contactValues.city}
        onChange={(val: string) =>
          setContactValues({ ...contactValues, city: val })
        }
        type={contactErrors.city ? "error" : ""}
        errorMessage={contactErrors.city}
      />
      <div className="flex flex-col sm:flex-row gap-4">
        <TextField
          label="State"
          placeholder="e.g. Karnataka"
          value={contactValues.state}
          onChange={(val: string) =>
            setContactValues({ ...contactValues, state: val })
          }
          type={contactErrors.state ? "error" : ""}
          errorMessage={contactErrors.state}
        />
        <TextField
          label="Postal Code"
          placeholder="e.g. 560076"
          value={contactValues.postal_code}
          onChange={(val: string) =>
            setContactValues({ ...contactValues, postal_code: val })
          }
          type={contactErrors.postal_code ? "error" : ""}
          errorMessage={contactErrors.postal_code}
        />
      </div>
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-400 dark:border-gray-200">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Contact" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default ContactForm;
