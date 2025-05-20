import React, { useState } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type CompanyFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const isValidE164 = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone);
const companyType = ["Supplier", "Distributor", "Factories", "Buyer"];

const CompanyForm = ({ userId, onClose }: CompanyFormProps) => {
  const [companyValues, setCompanyValues] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phoneNumber: "",
    type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    website: "",
    industry: "",
  });
  const [companyErrors, setCompanyErrors] = useState({
    phoneNumber: "",
    address_line_1: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const handleSubmitCompanies = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = [
      "companyName",
      "contactPerson",
      "address_line_1",
      "city",
      "state",
      "postal_code",
    ];
    const missingFields = requiredFields.filter(
      (field) => !companyValues[field as keyof typeof companyValues]?.trim()
    );
    if (missingFields.length > 0) {
      triggerToast(
        `Please fill in required fields: ${missingFields.join(", ")}`,
        "error"
      );
      return;
    }
    if (companyValues.phoneNumber && !isValidE164(companyValues.phoneNumber)) {
      setCompanyErrors({
        ...companyErrors,
        phoneNumber: "Please enter a valid phone number (e.g. +1234567890)",
      });
      triggerToast("Invalid company phone number.", "error");
      return;
    } else {
      setCompanyErrors({ ...companyErrors, phoneNumber: "" });
    }
    if (
      companyValues.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyValues.email)
    ) {
      triggerToast("Please enter a valid email address.", "error");
      return;
    }
    const payload = {
      user_id: userId,
      company_name: companyValues.companyName,
      contact_person: companyValues.contactPerson,
      email: companyValues.email || null,
      phone_number: companyValues.phoneNumber || null,
      type: companyValues.type || null,
      address_line_1: companyValues.address_line_1,
      address_line_2: companyValues.address_line_2 || null,
      city: companyValues.city,
      state: companyValues.state,
      postal_code: companyValues.postal_code,
      website: companyValues.website || null,
      industry: companyValues.industry || null,
    };
    try {
      const response = await axiosInstance.post("/companies/add", payload);
      if (response.status === 201) {
        setCompanyValues({
          companyName: "",
          contactPerson: "",
          email: "",
          phoneNumber: "",
          type: "",
          address_line_1: "",
          address_line_2: "",
          city: "",
          state: "",
          postal_code: "",
          website: "",
          industry: "",
        });
        triggerToast("Company added successfully!", "success");
        onClose();
        window.location.reload();
      }
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
      onSubmit={handleSubmitCompanies}
      noValidate
    >
      <TextField
        label="Company Name"
        placeholder="Enter company name"
        value={companyValues.companyName}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, companyName: val })
        }
      />
      <TextField
        label="Contact Person"
        placeholder="e.g. John Doe"
        value={companyValues.contactPerson}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, contactPerson: val })
        }
      />
      <TextField
        label="Company Email"
        placeholder="e.g. contact@company.com"
        value={companyValues.email}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, email: val })
        }
      />
      <TextField
        label="Company Phone"
        placeholder="e.g. +91 XXXXX XXXXX"
        value={companyValues.phoneNumber}
        onChange={(val: string) => {
          setCompanyValues({ ...companyValues, phoneNumber: val });
          if (val && !isValidE164(val)) {
            setCompanyErrors({
              ...companyErrors,
              phoneNumber: "Company phone invalid",
            });
          } else {
            setCompanyErrors({ ...companyErrors, phoneNumber: "" });
          }
        }}
        type={companyErrors.phoneNumber ? "error" : ""}
        errorMessage={companyErrors.phoneNumber}
      />
      <DropdownLarge
        items={companyType}
        selectedItem={companyValues.type}
        onSelect={(value: string) =>
          setCompanyValues({ ...companyValues, type: value })
        }
        type="form"
        label="Type"
        width="full"
      />
      <TextField
        label="Address Line 1"
        placeholder="e.g. Head Office, Tower B"
        value={companyValues.address_line_1}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, address_line_1: val })
        }
        type={companyErrors.address_line_1 ? "error" : ""}
        errorMessage={companyErrors.address_line_1}
      />
      <TextField
        label="Address Line 2 (Optional)"
        placeholder="e.g. Street Name, Area"
        value={companyValues.address_line_2}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, address_line_2: val })
        }
      />
      <TextField
        label="City"
        placeholder="e.g. Mumbai"
        value={companyValues.city}
        onChange={(val: string) =>
          setCompanyValues({ ...companyValues, city: val })
        }
        type={companyErrors.city ? "error" : ""}
        errorMessage={companyErrors.city}
      />
      <div className="flex flex-col sm:flex-row gap-4">
        <TextField
          label="State"
          placeholder="e.g. Maharashtra"
          value={companyValues.state}
          onChange={(val: string) =>
            setCompanyValues({ ...companyValues, state: val })
          }
          type={companyErrors.state ? "error" : ""}
          errorMessage={companyErrors.state}
        />
        <TextField
          label="Postal Code"
          placeholder="e.g. 400001"
          value={companyValues.postal_code}
          onChange={(val: string) =>
            setCompanyValues({ ...companyValues, postal_code: val })
          }
          type={companyErrors.postal_code ? "error" : ""}
          errorMessage={companyErrors.postal_code}
        />
      </div>
      <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-400 dark:border-gray-200">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Company" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default CompanyForm;
