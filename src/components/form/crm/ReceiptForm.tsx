import React, { useState } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type Item = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

const initialReceiptItem: Item = {
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
};

type ReceiptFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const ReceiptForm = ({ userId, onClose }: ReceiptFormProps) => {
  const [receiptsValues, setReceiptsValues] = useState({
    title: "",
    receiptNumber: "",
    billTo: "",
    dueDate: "",
    paymentTerms: "",
    notes: "",
    tax: "0",
    discount: "0",
    shipping: "0",
    billToAddressLine1: "",
    billToAddressLine2: "",
    billToCity: "",
    billToState: "",
    billToPostalCode: "",
    billToCountry: "",
    items: [initialReceiptItem],
  });
  const [receiptErrors, setReceiptErrors] = useState({
    title: "",
    receiptNumber: "",
    billTo: "",
    dueDate: "",
  });

  const validateReceiptForm = () => {
    const errors = { title: "", receiptNumber: "", billTo: "", dueDate: "" };
    let isValid = true;
    if (!receiptsValues.title.trim()) {
      errors.title = "Title is required.";
      isValid = false;
    }
    if (!receiptsValues.receiptNumber.trim()) {
      errors.receiptNumber = "Invoice Number is required.";
      isValid = false;
    }
    if (!receiptsValues.billTo.trim()) {
      errors.billTo = "Bill To (Customer) is required.";
      isValid = false;
    }
    if (!receiptsValues.dueDate.trim()) {
      errors.dueDate = "Due Date is required.";
      isValid = false;
    }
    setReceiptErrors(errors);
    return isValid;
  };

  const handleSubmitReceipts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReceiptForm()) {
      triggerToast("Please fill all required invoice fields.", "error");
      return;
    }
    const payload = {
      user_id: userId,
      title: receiptsValues.title,
      bill_to: receiptsValues.billTo,
      due_date: receiptsValues.dueDate,
      receipt_number: receiptsValues.receiptNumber,
      payment_terms: receiptsValues.paymentTerms || null,
      notes: receiptsValues.notes || null,
      tax: parseFloat(receiptsValues.tax) || 0,
      discount: parseFloat(receiptsValues.discount) || 0,
      shipping: parseFloat(receiptsValues.shipping) || 0,
      bill_to_address_line1: receiptsValues.billToAddressLine1 || null,
      bill_to_address_line2: receiptsValues.billToAddressLine2 || null,
      bill_to_city: receiptsValues.billToCity || null,
      bill_to_state: receiptsValues.billToState || null,
      bill_to_postal_code: receiptsValues.billToPostalCode || null,
      bill_to_country: receiptsValues.billToCountry || null,
      items: receiptsValues.items
        .map(({ description, quantity, rate }) => ({
          description,
          quantity: Number(quantity) || 0,
          rate: Number(rate) || 0,
        }))
        .filter((item) => item.description && item.description.trim() !== ""),
    };
    try {
      await axiosInstance.post("/receipts/add", payload);
      setReceiptsValues({
        title: "",
        receiptNumber: "",
        billTo: "",
        dueDate: "",
        paymentTerms: "",
        notes: "",
        tax: "0",
        discount: "0",
        shipping: "0",
        billToAddressLine1: "",
        billToAddressLine2: "",
        billToCity: "",
        billToState: "",
        billToPostalCode: "",
        billToCountry: "",
        items: [initialReceiptItem],
      });
      setReceiptErrors({
        title: "",
        receiptNumber: "",
        billTo: "",
        dueDate: "",
      });
      triggerToast("Invoice added successfully!", "success");
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
      className="flex flex-col gap-6 w-full"
      onSubmit={handleSubmitReceipts}
    >
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
          Invoice Details
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Invoice Title*"
              placeholder="e.g. Web Development Services"
              value={receiptsValues.title}
              onChange={(val: string) =>
                setReceiptsValues({ ...receiptsValues, title: val })
              }
              type={receiptErrors.title ? "error" : ""}
              errorMessage={receiptErrors.title}
            />
            <TextField
              label="Invoice Number*"
              placeholder="e.g. INV-2024-001"
              value={receiptsValues.receiptNumber}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  receiptNumber: val,
                })
              }
              type={receiptErrors.receiptNumber ? "error" : ""}
              errorMessage={receiptErrors.receiptNumber}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Bill To (Customer Name)*"
              placeholder="e.g. Acme Corp"
              value={receiptsValues.billTo}
              onChange={(val: string) =>
                setReceiptsValues({ ...receiptsValues, billTo: val })
              }
              type={receiptErrors.billTo ? "error" : ""}
              errorMessage={receiptErrors.billTo}
            />
            <TextField
              label="Due Date*"
              placeholder="YYYY-MM-DD"
              value={receiptsValues.dueDate}
              onChange={(val: string) =>
                setReceiptsValues({ ...receiptsValues, dueDate: val })
              }
              calendar
              type={receiptErrors.dueDate ? "error" : ""}
              errorMessage={receiptErrors.dueDate}
            />
          </div>
          <TextField
            label="Payment Terms"
            placeholder="e.g. Net 30, Due on Receipt"
            value={receiptsValues.paymentTerms}
            onChange={(val: string) =>
              setReceiptsValues({
                ...receiptsValues,
                paymentTerms: val,
              })
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
          Billing Address
        </h3>
        <div className="space-y-4">
          <TextField
            label="Address Line 1"
            placeholder="Customer's street address"
            value={receiptsValues.billToAddressLine1}
            onChange={(val: string) =>
              setReceiptsValues({
                ...receiptsValues,
                billToAddressLine1: val,
              })
            }
          />
          <TextField
            label="Address Line 2 (Optional)"
            placeholder="Apartment, suite, etc."
            value={receiptsValues.billToAddressLine2}
            onChange={(val: string) =>
              setReceiptsValues({
                ...receiptsValues,
                billToAddressLine2: val,
              })
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="City"
              placeholder="Customer's city"
              value={receiptsValues.billToCity}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  billToCity: val,
                })
              }
            />
            <TextField
              label="State / Province"
              placeholder="Customer's state"
              value={receiptsValues.billToState}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  billToState: val,
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Postal Code"
              placeholder="Customer's postal code"
              value={receiptsValues.billToPostalCode}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  billToPostalCode: val,
                })
              }
            />
            <TextField
              label="Country"
              placeholder="Customer's country"
              value={receiptsValues.billToCountry}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  billToCountry: val,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-auto pt-6 border-t border-gray-400 dark:border-gray-200">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Invoice" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default ReceiptForm;
