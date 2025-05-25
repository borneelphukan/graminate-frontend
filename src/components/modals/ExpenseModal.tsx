import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "../ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/ui/Loader";

type ExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string | undefined;
  onExpenseAdded: () => void;
};

const EXPENSE_CATEGORIES = {
  "Goods & Services": ["Farm Utilities", "Agricultural Feeds", "Consulting"],
  "Utility Expenses": [
    "Electricity",
    "Labour Salary",
    "Water Supply",
    "Taxes",
    "Others",
  ],
};

const ExpenseModal = ({
  isOpen,
  onClose,
  userId,
  onExpenseAdded,
}: ExpenseModalProps) => {
  const [title, setTitle] = useState("");
  const [dateCreated, setDateCreated] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [occupation, setOccupation] = useState("");
  const [category, setCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

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
      setTitle("");
      setDateCreated(new Date().toISOString().split("T")[0]);
      setOccupation("");
      setCategory("");
      setExpenseAmount("");
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
    if (!title.trim()) newErrors.title = "Expense title is required.";
    if (!dateCreated) newErrors.dateCreated = "Expense date is required.";
    if (!category.trim()) newErrors.category = "Expense category is required.";
    if (!expenseAmount.trim() || Number(expenseAmount) <= 0)
      newErrors.expenseAmount = "Expense amount must be greater than 0.";
    if (!userId) newErrors.general = "User ID is missing.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!userId) {
      Swal.fire("Error", "User ID is not available.", "error");
      return;
    }

    setIsLoading(true);

    const expenseData = {
      user_id: Number(userId),
      title: title.trim(),
      occupation: occupation || undefined,
      category: category.trim(),
      expense: Number(expenseAmount),
      date_created: dateCreated,
    };

    await axiosInstance.post("/expenses/add", expenseData);
    onExpenseAdded();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[90vh] my-auto overflow-y-auto p-6 md:p-8 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-400">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Log New Expense
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
          <TextField
            label="Expense Title"
            placeholder="e.g., Purchase of Animal Feed"
            value={title}
            onChange={(val) => setTitle(val)}
            errorMessage={errors.title}
            type={errors.title ? "error" : ""}
            width="large"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Date of Logging Expense"
              calendar={true}
              value={dateCreated}
              onChange={(val) => setDateCreated(val)}
              errorMessage={errors.dateCreated}
              type={errors.dateCreated ? "error" : ""}
              width="large"
            />
            <TextField
              label="Amount (₹)"
              number={true}
              value={expenseAmount}
              onChange={(val) => setExpenseAmount(val.replace(/[^0-9.]/g, ""))}
              errorMessage={errors.expenseAmount}
              type={errors.expenseAmount ? "error" : ""}
              width="large"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingSubTypes ? (
              <div className="flex flex-col">
                <div className="p-2.5 border border-gray-400 dark:border-gray-200 rounded-md flex items-center justify-center h-[42px]">
                  <Loader />
                </div>
              </div>
            ) : (
              <DropdownSmall
                direction="up"
                label="Related Occupation"
                items={subTypes}
                selected={occupation}
                onSelect={(val) =>
                  setOccupation(val === "N/A - No occupations found" ? "" : val)
                }
                placeholder="Select an occupation"
              />
            )}

            <DropdownSmall
              direction="up"
              label="Expense Category"
              items={EXPENSE_CATEGORIES}
              selected={category}
              onSelect={(val) => setCategory(val)}
              placeholder="Select a category"
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
              text={
                isLoading || isLoadingSubTypes ? "Logging..." : "Log Expense"
              }
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

export default ExpenseModal;
