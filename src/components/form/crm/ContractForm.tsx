import React, { useState } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { CONTRACT_STATUS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type ContractFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

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
    const payload = {
      user_id: userId,
      deal_name: contractsValues.dealName,
      partner: contractsValues.dealPartner,
      amount: contractsValues.amountPaid,
      stage: contractsValues.status,
      start_date: contractsValues.contractStartDate || null,
      end_date: contractsValues.contractEndDate || null,
      category: contractsValues.category,
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
        label="Contract Name"
        placeholder="Name of your Contract"
        value={contractsValues.dealName}
        onChange={(val: string) =>
          setContractsValues({ ...contractsValues, dealName: val })
        }
      />
      <TextField
        label="Category"
        placeholder="Contract category"
        value={contractsValues.category}
        onChange={(val: string) =>
          setContractsValues({ ...contractsValues, category: val })
        }
      />
      <DropdownLarge
        label="Contract Stage"
        items={CONTRACT_STATUS}
        selectedItem={contractsValues.status}
        onSelect={(val: string) =>
          setContractsValues({ ...contractsValues, status: val })
        }
        type="form"
        width="full"
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
      <TextField
        label="Contract With"
        placeholder="Company, Business owner"
        value={contractsValues.dealPartner}
        onChange={(val: string) =>
          setContractsValues({ ...contractsValues, dealPartner: val })
        }
      />
      <DropdownLarge
        label="Priority"
        items={["Low", "Medium", "High"]}
        selectedItem={contractsValues.priority}
        onSelect={(val: string) =>
          setContractsValues({ ...contractsValues, priority: val })
        }
        type="form"
        width="full"
      />
      <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-400 dark:border-gray-200">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Contract" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default ContractForm;
