import { useState } from "react";
import { showToast, toastMessage } from "@/stores/toast";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import { useSalaryModalPrefill } from "@/hooks/modals";
import axiosInstance from "@/lib/utils/axiosInstance";
import axios from "axios";

type PaymentData = {
  payment_id: number;
  labour_id: number;
  payment_date: string;
  salary_paid: number;
  bonus: number;
  overtime_pay: number;
  housing_allowance: number;
  travel_allowance: number;
  meal_allowance: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
};

type SalaryModalProps = {
  labourId: number | string;
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: PaymentData;
};

const SalaryModal = ({
  labourId,
  onClose,
  onSuccess,
  editMode = false,
  initialData,
}: SalaryModalProps) => {
  const [paymentDate, setPaymentDate] = useState("");
  const [salaryPaid, setSalaryPaid] = useState("");
  const [bonus, setBonus] = useState("");
  const [overtimePay, setOvertimePay] = useState("");
  const [housingAllowance, setHousingAllowance] = useState("");
  const [travelAllowance, setTravelAllowance] = useState("");
  const [mealAllowance, setMealAllowance] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [loading, setLoading] = useState(false);

  useSalaryModalPrefill(editMode, initialData, {
    setPaymentDate,
    setSalaryPaid,
    setBonus,
    setOvertimePay,
    setHousingAllowance,
    setTravelAllowance,
    setMealAllowance,
    setPaymentStatus,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentDate || !salaryPaid) {
      toastMessage.set({
        message: "Payment Date and Salary Paid are required.",
        type: "error",
      });
      showToast.set(true);
      return;
    }

    setLoading(true);

    const parseOrDefault = (value: string) => parseFloat(value) || 0;

    const payload = {
      labour_id: labourId,
      payment_date: paymentDate,
      salary_paid: parseOrDefault(salaryPaid),
      bonus: parseOrDefault(bonus),
      overtime_pay: parseOrDefault(overtimePay),
      housing_allowance: parseOrDefault(housingAllowance),
      travel_allowance: parseOrDefault(travelAllowance),
      meal_allowance: parseOrDefault(mealAllowance),
      payment_status: paymentStatus,
    };

    try {
      if (editMode && initialData) {
        await axiosInstance.put(`/labour_payment/update`, {
          ...payload,
          payment_id: initialData.payment_id,
        });
      } else {
        await axiosInstance.post(`/labour_payment/add`, payload);
      }

      toastMessage.set({
        message: editMode
          ? "Salary updated successfully!"
          : "Salary added successfully!",
        type: "success",
      });
      showToast.set(true);

      onClose();
      onSuccess();
      window.location.reload();
    } catch (error) {
      console.error("Error submitting salary data:", error);
      const errorMessage =
        (axios.isAxiosError(error) && error.response?.data?.message) ||
        "An unexpected error occurred.";
      toastMessage.set({ message: errorMessage, type: "error" });
      showToast.set(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] my-auto overflow-y-auto p-8 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-600">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editMode ? "Update Salary" : "Add New Salary"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1"></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Payment Date *"
              calendar
              value={paymentDate}
              onChange={setPaymentDate}
              width="large"
            />
            <TextField
              label="Salary to Pay / Paid *"
              number
              value={salaryPaid}
              onChange={setSalaryPaid}
              width="large"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Bonus"
              number
              value={bonus}
              onChange={setBonus}
              width="large"
              placeholder="0.00"
            />
            <TextField
              label="Overtime Pay"
              number
              value={overtimePay}
              onChange={setOvertimePay}
              width="large"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <TextField
              label="Housing Allowance"
              number
              value={housingAllowance}
              onChange={setHousingAllowance}
              width="large"
              placeholder="0.00"
            />
            <TextField
              label="Travel Allowance"
              number
              value={travelAllowance}
              onChange={setTravelAllowance}
              width="large"
              placeholder="0.00"
            />
            <TextField
              label="Meal Allowance"
              number
              value={mealAllowance}
              onChange={setMealAllowance}
              width="large"
              placeholder="0.00"
            />
          </div>

          <DropdownLarge
            items={["Pending", "Paid"]}
            selectedItem={paymentStatus}
            onSelect={setPaymentStatus}
            label="Payment Status"
            type="form"
            width="full"
          />

          <div className="flex justify-end gap-4 pt-6 mt-8">
            <Button
              text="Cancel"
              style="secondary"
              onClick={onClose}
              type="button"
              isDisabled={loading}
            />
            <Button
              text={
                loading
                  ? editMode
                    ? "Updating..."
                    : "Adding..."
                  : editMode
                  ? "Update Salary"
                  : "Add Salary"
              }
              style="primary"
              type="submit"
              isDisabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryModal;
