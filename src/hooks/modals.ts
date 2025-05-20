import { useEffect } from "react";

type SetString = React.Dispatch<React.SetStateAction<string>>;
type SetPaymentStatus = React.Dispatch<React.SetStateAction<string>>;

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

export const useSalaryModalPrefill = (
  editMode: boolean,
  initialData: PaymentData | undefined,
  setters: {
    setPaymentDate: SetString;
    setSalaryPaid: SetString;
    setBonus: SetString;
    setOvertimePay: SetString;
    setHousingAllowance: SetString;
    setTravelAllowance: SetString;
    setMealAllowance: SetString;
    setPaymentStatus: SetPaymentStatus;
  }
) => {
  const {
    setPaymentDate,
    setSalaryPaid,
    setBonus,
    setOvertimePay,
    setHousingAllowance,
    setTravelAllowance,
    setMealAllowance,
    setPaymentStatus,
  } = setters;

  useEffect(() => {
    if (editMode && initialData) {
      // Ensure initialData and its properties exist before accessing them
      setPaymentDate(
        initialData.payment_date ? initialData.payment_date.slice(0, 10) : ""
      );
      setSalaryPaid(
        initialData.salary_paid != null
          ? initialData.salary_paid.toString()
          : ""
      );
      setBonus(initialData.bonus != null ? initialData.bonus.toString() : "");
      setOvertimePay(
        initialData.overtime_pay != null
          ? initialData.overtime_pay.toString()
          : ""
      );
      setHousingAllowance(
        initialData.housing_allowance != null
          ? initialData.housing_allowance.toString()
          : ""
      );
      setTravelAllowance(
        initialData.travel_allowance != null
          ? initialData.travel_allowance.toString()
          : ""
      );
      setMealAllowance(
        initialData.meal_allowance != null
          ? initialData.meal_allowance.toString()
          : ""
      );
      setPaymentStatus(initialData.payment_status || "Pending"); // Default if null/undefined
    } else {
      // Resetting state when not in edit mode or no initial data
      setPaymentDate("");
      setSalaryPaid("");
      setBonus("");
      setOvertimePay("");
      setHousingAllowance("");
      setTravelAllowance("");
      setMealAllowance("");
      setPaymentStatus("Pending");
    }
  }, [
    editMode,
    initialData,
    setPaymentDate,
    setSalaryPaid,
    setBonus,
    setOvertimePay,
    setHousingAllowance,
    setTravelAllowance,
    setMealAllowance,
    setPaymentStatus,
  ]);
};
