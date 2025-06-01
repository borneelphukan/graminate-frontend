import React, { useState, useRef, useEffect } from "react";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import { CONTRACT_STATUS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type ContractFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

type Company = {
  company_id: number;
  user_id: number;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  type?: string;
  created_at: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  website?: string;
  industry?: string;
}

const ContractForm = ({ userId, onClose }: ContractFormProps) => {
  const [contractsValues, setContractsValues] = useState({
    dealName: "",
    dealPartner: "",
    amountPaid: "",
    status: "",
    contractStartDate: "",
    contractEndDate: "",
    category: "",
    priority: "Medium",
  });

  const [categorySubTypes, setCategorySubTypes] = useState<string[]>([]);
  const [isLoadingCategorySubTypes, setIsLoadingCategorySubTypes] =
    useState(true);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categorySuggestionsRef = useRef<HTMLDivElement>(null);

  const [companyNamesList, setCompanyNamesList] = useState<string[]>([]);
  const [isLoadingCompanyNames, setIsLoadingCompanyNames] = useState(true);
  const [dealPartnerSuggestions, setDealPartnerSuggestions] = useState<
    string[]
  >([]);
  const [showDealPartnerSuggestions, setShowDealPartnerSuggestions] =
    useState(false);
  const dealPartnerSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categorySuggestionsRef.current &&
        !categorySuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowCategorySuggestions(false);
      }
      if (
        dealPartnerSuggestionsRef.current &&
        !dealPartnerSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowDealPartnerSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      setIsLoadingCategorySubTypes(true);
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const user = response.data?.data?.user ?? response.data?.user;
        if (!user) throw new Error("User payload missing");
        setCategorySubTypes(Array.isArray(user.sub_type) ? user.sub_type : []);
      } catch (err) {
        setCategorySubTypes([]);
      } finally {
        setIsLoadingCategorySubTypes(false);
      }
    };
    if (userId) {
      fetchUserSubTypes();
    }
  }, [userId]);

  useEffect(() => {
    const fetchCompanyNames = async () => {
      if (!userId) return;
      setIsLoadingCompanyNames(true);
      try {
        const response = await axiosInstance.get<{ companies: Company[] }>(
          `/companies/${userId}`
        );
        const names =
          response.data?.companies?.map((company) => company.company_name) ||
          [];
        setCompanyNamesList(names);
      } catch (err) {
        setCompanyNamesList([]);
      } finally {
        setIsLoadingCompanyNames(false);
      }
    };
    fetchCompanyNames();
  }, [userId]);

  const handleCategoryInputChange = (val: string) => {
    setContractsValues({ ...contractsValues, category: val });
    if (val.length > 0) {
      const filtered = categorySubTypes.filter((subType) =>
        subType.toLowerCase().includes(val.toLowerCase())
      );
      setCategorySuggestions(filtered);
      setShowCategorySuggestions(true);
    } else {
      setCategorySuggestions(categorySubTypes);
      setShowCategorySuggestions(true);
    }
  };

  const selectCategorySuggestion = (suggestion: string) => {
    setContractsValues({ ...contractsValues, category: suggestion });
    setShowCategorySuggestions(false);
  };

  const handleCategoryInputFocus = () => {
    if (categorySubTypes.length > 0) {
      setCategorySuggestions(categorySubTypes);
      setShowCategorySuggestions(true);
    }
  };

  const handleDealPartnerInputChange = (val: string) => {
    setContractsValues({ ...contractsValues, dealPartner: val });
    if (val.length > 0 && companyNamesList.length > 0) {
      const filtered = companyNamesList.filter((name) =>
        name.toLowerCase().includes(val.toLowerCase())
      );
      setDealPartnerSuggestions(filtered);
      setShowDealPartnerSuggestions(filtered.length > 0);
    } else {
      setDealPartnerSuggestions([]);
      setShowDealPartnerSuggestions(false);
    }
  };

  const selectDealPartnerSuggestion = (suggestion: string) => {
    setContractsValues({ ...contractsValues, dealPartner: suggestion });
    setShowDealPartnerSuggestions(false);
  };

  const handleDealPartnerInputFocus = () => {
    const currentPartnerValue = contractsValues.dealPartner;
    if (currentPartnerValue.length > 0 && companyNamesList.length > 0) {
      const filtered = companyNamesList.filter((name) =>
        name.toLowerCase().includes(currentPartnerValue.toLowerCase())
      );
      setDealPartnerSuggestions(filtered);
      setShowDealPartnerSuggestions(filtered.length > 0);
    } else {
      setShowDealPartnerSuggestions(false);
    }
  };

  const handleSubmitContracts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !contractsValues.dealName ||
      !contractsValues.status ||
      !contractsValues.amountPaid
    ) {
      triggerToast("Please fill in Contract Name, Stage, and Amount.", "error");
      return;
    }

    if (!contractsValues.contractStartDate) {
      triggerToast("Start Date is required.", "error");
      return;
    }

    const payload = {
      user_id: Number(userId),
      deal_name: contractsValues.dealName,
      partner: contractsValues.dealPartner,
      amount: parseFloat(contractsValues.amountPaid),
      stage: contractsValues.status,
      start_date: contractsValues.contractStartDate,
      end_date: contractsValues.contractEndDate || null,
      category: contractsValues.category || null,
      priority: contractsValues.priority,
    };
    try {
      await axiosInstance.post("/contracts/add", payload);
      setContractsValues({
        dealName: "",
        dealPartner: "",
        amountPaid: "",
        status: "",
        contractStartDate: "",
        contractEndDate: "",
        category: "",
        priority: "Medium",
      });
      triggerToast("Contract added successfully!", "success");
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
      onSubmit={handleSubmitContracts}
    >
      <TextField
        label="Contract Title"
        placeholder="Name of your Contract"
        value={contractsValues.dealName}
        onChange={(val: string) =>
          setContractsValues({ ...contractsValues, dealName: val })
        }
      />
      <div className="relative">
        <TextField
          label="Contract Occupation Category"
          placeholder="Contract category"
          value={contractsValues.category}
          onChange={handleCategoryInputChange}
          onFocus={handleCategoryInputFocus}
          isLoading={isLoadingCategorySubTypes}
        />
        {categorySuggestions.length > 0 && showCategorySuggestions && (
          <div
            ref={categorySuggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {categorySuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-light dark:hover:bg-gray-800 text-sm cursor-pointer"
                onClick={() => selectCategorySuggestion(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <DropdownSmall
        label="Contract Stage"
        items={CONTRACT_STATUS}
        selected={contractsValues.status}
        onSelect={(val: string) =>
          setContractsValues({ ...contractsValues, status: val })
        }
        placeholder="Select Stage"
      />
      <TextField
        label="Amount (₹)"
        placeholder="Budget involved"
        value={contractsValues.amountPaid}
        onChange={(val: string) =>
          setContractsValues({ ...contractsValues, amountPaid: val })
        }
      />
      <div className="flex flex-col sm:flex-row gap-4">
        <TextField
          label="Start Date"
          placeholder="YYYY-MM-DD"
          value={contractsValues.contractStartDate}
          onChange={(val: string) =>
            setContractsValues({
              ...contractsValues,
              contractStartDate: val,
            })
          }
          calendar
        />
        <TextField
          label="End Date"
          placeholder="YYYY-MM-DD"
          value={contractsValues.contractEndDate}
          onChange={(val: string) =>
            setContractsValues({
              ...contractsValues,
              contractEndDate: val,
            })
          }
          calendar
        />
      </div>
      <div className="relative">
        <TextField
          label="Contract With"
          placeholder="Company, Business owner"
          value={contractsValues.dealPartner}
          onChange={handleDealPartnerInputChange}
          onFocus={handleDealPartnerInputFocus}
          isLoading={isLoadingCompanyNames}
        />
        {dealPartnerSuggestions.length > 0 && showDealPartnerSuggestions && (
          <div
            ref={dealPartnerSuggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {dealPartnerSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-light dark:hover:bg-gray-800 text-sm cursor-pointer"
                onClick={() => selectDealPartnerSuggestion(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <DropdownSmall
        label="Priority"
        items={["Low", "Medium", "High"]}
        selected={contractsValues.priority}
        onSelect={(val: string) =>
          setContractsValues({ ...contractsValues, priority: val })
        }
        placeholder="Select Priority"
      />
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Contract" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default ContractForm;
