import Button from "@/components/ui/Button";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import TextField from "@/components/ui/TextField";
import { CONTRACT_STATUS, PRIORITY_OPTIONS } from "@/constants/options";
import PlatformLayout from "@/layout/PlatformLayout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { triggerToast } from "@/stores/toast";
import Head from "next/head";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";

type ContractData = {
  deal_id: number;
  deal_name: string;
  partner: string;
  amount: number;
  stage: string;
  start_date: string;
  end_date: string | null;
  category?: string | null;
  priority: string;
};

const ContractDetails = () => {
  const router = useRouter();
  const { user_id, data } = router.query;
  const [contract, setContract] = useState<ContractData | null>(null);
  const [contractName, setContractName] = useState("");
  const [displayContractName, setDisplayContractName] = useState("");
  const [partnerClient, setPartnerClient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [initialFormData, setInitialFormData] = useState({
    contractName: "",
    partnerClient: "",
    amount: "",
    status: "",
    startDate: "",
    endDate: "",
    category: "",
    priority: "Medium",
  });

  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (data && typeof data === "string") {
      try {
        const parsedContract = JSON.parse(data) as ContractData;
        setContract(parsedContract);

        const initDealName = parsedContract.deal_name || "";
        const initPartnerClient = parsedContract.partner || "";
        const initAmount = parsedContract.amount?.toString() || "";
        const initStatus = parsedContract.stage || "";
        const initStartDate = formatDate(parsedContract.start_date);
        const initEndDate = formatDate(parsedContract.end_date);
        const initCategory = parsedContract.category || "";
        const initPriority = parsedContract.priority || "Medium";

        setContractName(initDealName);
        setPartnerClient(initPartnerClient);
        setAmount(initAmount);
        setStatus(initStatus);
        setStartDate(initStartDate);
        setEndDate(initEndDate);
        setCategory(initCategory);
        setPriority(initPriority);

        setDisplayContractName(initDealName);

        setInitialFormData({
          contractName: initDealName,
          partnerClient: initPartnerClient,
          amount: initAmount,
          status: initStatus,
          startDate: initStartDate,
          endDate: initEndDate,
          category: initCategory,
          priority: initPriority,
        });
      } catch (error) {
        console.error("Error parsing contract data:", error);
        triggerToast("Failed to load contract data.", "error");
      }
    }
  }, [data]);

  if (!contract)
    return (
      <p>
        <Loader />
      </p>
    );

  const hasChanges =
    contractName !== initialFormData.contractName ||
    partnerClient !== initialFormData.partnerClient ||
    amount !== initialFormData.amount ||
    status !== initialFormData.status ||
    startDate !== initialFormData.startDate ||
    endDate !== initialFormData.endDate ||
    category !== initialFormData.category ||
    priority !== initialFormData.priority;

  const handleSave = async () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      triggerToast("End Date of Contract cannot be before Start Date", "error");
      return;
    }

    setSaving(true);

    const payload = {
      id: contract.deal_id,
      deal_name: contractName,
      partner: partnerClient,
      amount: parseFloat(amount) || 0,
      stage: status,
      start_date: startDate || null,
      end_date: endDate || null,
      category: category || null,
      priority: priority,
    };

    try {
      await axiosInstance.put("/contracts/update", payload);
      triggerToast("Contract updated successfully", "success");
      setDisplayContractName(contractName);

      setInitialFormData({
        contractName,
        partnerClient,
        amount,
        status,
        startDate,
        endDate,
        category,
        priority,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "An error occurred while updating the contract.";

      triggerToast(errorMessage || "An unexpected error occurred.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlatformLayout>
      <Head>
        <title>Contract | {displayContractName || "Details"}</title>
      </Head>
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <Button
            text="Back"
            style="ghost"
            arrow="left"
            onClick={() =>
              router.push(`/platform/${user_id}/crm?view=contracts`)
            }
          />
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
            {displayContractName || "Contract Details"}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Contract Name"
              value={contractName}
              onChange={(val) => setContractName(val)}
              placeholder="Enter contract name"
            />
            <TextField
              label="Partner / Client"
              value={partnerClient}
              onChange={(val) => setPartnerClient(val)}
              placeholder="Enter partner or client name"
            />
            <TextField
              label="Amount (₹)"
              value={amount}
              onChange={(val) => setAmount(val)}
              placeholder="e.g., 50000"
            />
            <DropdownLarge
              items={CONTRACT_STATUS}
              selectedItem={status}
              onSelect={(value: string) => setStatus(value)}
              type="form"
              label="Stage"
              width="full"
            />
            <TextField
              label="Category"
              value={category}
              onChange={(val) => setCategory(val)}
              placeholder="e.g., Service Agreement, Product Sale"
            />
            <DropdownLarge
              items={PRIORITY_OPTIONS || ["Low", "Medium", "High"]}
              selectedItem={priority}
              onSelect={(value: string) => setPriority(value)}
              type="form"
              label="Priority"
              width="full"
            />
            <DropdownLarge
              label="Start Date"
              selectedItem={startDate}
              onSelect={(val) => setStartDate(val)}
              items={[]}
              isDatePicker={true}
              width="full"
              type="form"
            />
            <DropdownLarge
              label="End Date"
              selectedItem={endDate}
              onSelect={(val) => setEndDate(val)}
              items={[]}
              isDatePicker={true}
              width="full"
              type="form"
            />
          </div>
          <div className="flex flex-row mt-8 space-x-4 justify-end">
            <Button
              text="Cancel"
              style="secondary"
              onClick={() =>
                router.push(`/platform/${user_id}/crm?view=contracts`)
              }
            />
            <Button
              text={saving ? "Updating..." : "Update Contract"}
              style="primary"
              onClick={handleSave}
              isDisabled={!hasChanges || saving}
            />
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
};

export default ContractDetails;
