import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";
import Loader from "@/components/ui/Loader";

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

type SaleRecordForDropdown = {
  sales_id: number;
  sales_name?: string;
  sales_date: string;
  items_sold: string[];
  occupation?: string;
  invoice_created: boolean;
  prices_per_unit?: number[];
};

type ReceiptFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const ReceiptForm = ({ userId, onClose }: ReceiptFormProps) => {
  const router = useRouter();
  const { saleId: querySaleId } = router.query;

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
    linked_sale_id: querySaleId ? Number(querySaleId) : null,
  });
  const [receiptErrors, setReceiptErrors] = useState({
    title: "",
    billTo: "",
    dueDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [allSalesForUser, setAllSalesForUser] = useState<
    SaleRecordForDropdown[]
  >([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [selectedSaleForDisplay, setSelectedSaleForDisplay] = useState<
    string | null
  >(null);

  const fetchSalesAndPreselect = useCallback(async () => {
    if (!userId) return;
    setIsLoadingSales(true);
    try {
      const response = await axiosInstance.get<{
        sales: SaleRecordForDropdown[];
      }>(`/sales/user/${userId}`);
      const fetchedSales = response.data.sales || [];
      setAllSalesForUser(fetchedSales);

      if (querySaleId) {
        const preselectedSale = fetchedSales.find(
          (s) => s.sales_id === Number(querySaleId)
        );
        if (preselectedSale) {
          if (preselectedSale.invoice_created) {
            triggerToast(
              "Warning: This sale already has an invoice. Linking will be verified by the server."
            );
          }
          const displayLabel =
            preselectedSale.sales_name ||
            `Sale #${preselectedSale.sales_id} (${new Date(
              preselectedSale.sales_date
            ).toLocaleDateString()})`;
          setSelectedSaleForDisplay(displayLabel);

          const saleTitle = preselectedSale.sales_name
            ? `Invoice for ${preselectedSale.sales_name}`
            : `Invoice for Sale #${preselectedSale.sales_id}`;
          const billToName = preselectedSale.occupation || "Customer";

          const itemsFromSale = preselectedSale.items_sold.map(
            (itemDesc, index) => ({
              description: itemDesc,
              quantity: 1,
              rate:
                preselectedSale.prices_per_unit &&
                preselectedSale.prices_per_unit[index]
                  ? preselectedSale.prices_per_unit[index]
                  : 0,
              amount:
                preselectedSale.prices_per_unit &&
                preselectedSale.prices_per_unit[index]
                  ? 1 * preselectedSale.prices_per_unit[index]
                  : 0,
            })
          );

          setReceiptsValues((prev) => ({
            ...prev,
            linked_sale_id: preselectedSale.sales_id,
            title: prev.title || saleTitle,
            billTo: prev.billTo || billToName,
            items:
              itemsFromSale.length > 0 ? itemsFromSale : [initialReceiptItem],
          }));
        } else {
          setReceiptsValues((prev) => ({ ...prev, linked_sale_id: null }));
          setSelectedSaleForDisplay(null);
        }
      }
    } catch (error) {
      console.error("Error fetching sales for dropdown:", error);
      triggerToast("Could not load sales data.", "error");
    } finally {
      setIsLoadingSales(false);
    }
  }, [userId, querySaleId]);

  useEffect(() => {
    fetchSalesAndPreselect();
  }, [fetchSalesAndPreselect]);

  const validateReceiptForm = () => {
    const errors = { title: "", billTo: "", dueDate: "" };
    let isValid = true;
    if (!receiptsValues.title.trim()) {
      errors.title = "Title is required.";
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
    setIsLoading(true);
    const payload = {
      user_id: userId,
      title: receiptsValues.title,
      bill_to: receiptsValues.billTo,
      due_date: receiptsValues.dueDate,
      receipt_number: receiptsValues.receiptNumber || null,
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
      linked_sale_id: receiptsValues.linked_sale_id,
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
        linked_sale_id: null,
      });
      setSelectedSaleForDisplay(null);
      setReceiptErrors({
        title: "",
        billTo: "",
        dueDate: "",
      });
      triggerToast("Invoice added successfully!", "success");
      onClose();
      const { pathname, query } = router;
      delete query.saleId;
      router.replace({ pathname, query }, undefined, { shallow: true });
      window.location.reload();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred";
      triggerToast(`Error: ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaleSelection = (selectedSaleIdString: string) => {
    if (selectedSaleIdString === "None" || !selectedSaleIdString) {
      setReceiptsValues((prev) => ({
        ...prev,
        linked_sale_id: null,
        title: "",
        billTo: "",
        items: [initialReceiptItem],
      }));
      setSelectedSaleForDisplay(null);
      return;
    }

    const selectedSaleId = Number(selectedSaleIdString);
    const sale = allSalesForUser.find((s) => s.sales_id === selectedSaleId);
    if (sale) {
      if (sale.invoice_created) {
        triggerToast(
          "Warning: This sale already has an invoice. Linking will be verified by the server."
        );
      }
      const displayLabel =
        sale.sales_name ||
        `Sale #${sale.sales_id} (${new Date(
          sale.sales_date
        ).toLocaleDateString()})`;
      setSelectedSaleForDisplay(displayLabel);

      const saleTitle = sale.sales_name
        ? `Invoice for ${sale.sales_name}`
        : `Invoice for Sale #${sale.sales_id}`;
      const billToName = sale.occupation || "Customer";
      const itemsFromSale = sale.items_sold.map((itemDesc, index) => ({
        description: itemDesc,
        quantity: 1,
        rate:
          sale.prices_per_unit && sale.prices_per_unit[index]
            ? sale.prices_per_unit[index]
            : 0,
        amount:
          sale.prices_per_unit && sale.prices_per_unit[index]
            ? 1 * sale.prices_per_unit[index]
            : 0,
      }));

      setReceiptsValues((prev) => ({
        ...prev,
        linked_sale_id: sale.sales_id,
        title: saleTitle,
        billTo: billToName,
        items: itemsFromSale.length > 0 ? itemsFromSale : [initialReceiptItem],
      }));
    }
  };

  // fetch sales to receipt form
  const salesDropdownItems = useMemo(() => {
    const items = [
      { value: "None", label: "None (No Linked Sale)" },
      ...allSalesForUser
        .filter(
          (sale) =>
            !sale.invoice_created ||
            sale.sales_id === receiptsValues.linked_sale_id
        )
        .map((sale) => ({
          value: sale.sales_id.toString(),
          label: sale.sales_name
            ? `${sale.sales_name} (ID: ${sale.sales_id}, ${new Date(
                sale.sales_date
              ).toLocaleDateString()})`
            : `Sale #${sale.sales_id} (${new Date(
                sale.sales_date
              ).toLocaleDateString()})`,
        })),
    ];
    if (
      receiptsValues.linked_sale_id &&
      !items.find(
        (item) => item.value === receiptsValues.linked_sale_id?.toString()
      )
    ) {
      const currentLinkedSale = allSalesForUser.find(
        (s) => s.sales_id === receiptsValues.linked_sale_id
      );
      if (currentLinkedSale) {
        items.push({
          value: currentLinkedSale.sales_id.toString(),
          label: currentLinkedSale.sales_name
            ? `${currentLinkedSale.sales_name} (ID: ${
                currentLinkedSale.sales_id
              }, ${new Date(
                currentLinkedSale.sales_date
              ).toLocaleDateString()})`
            : `Sale #${currentLinkedSale.sales_id} (${new Date(
                currentLinkedSale.sales_date
              ).toLocaleDateString()})`,
        });
      }
    }
    return items;
  }, [allSalesForUser, receiptsValues.linked_sale_id]);

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
              placeholder="e.g. Invoice for Customer"
              value={receiptsValues.title}
              onChange={(val: string) =>
                setReceiptsValues({ ...receiptsValues, title: val })
              }
              errorMessage={receiptErrors.title}
            />
            <TextField
              label="Invoice Number (Optional)"
              placeholder="e.g. INV-2024-001"
              value={receiptsValues.receiptNumber}
              onChange={(val: string) =>
                setReceiptsValues({
                  ...receiptsValues,
                  receiptNumber: val,
                })
              }
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
              errorMessage={receiptErrors.dueDate}
            />
          </div>
          {isLoadingSales ? (
            <div className="flex flex-col">
              <label className="block mb-1 text-sm font-medium text-dark dark:text-gray-300">
                Link to Sale (Optional)
              </label>
              <div className="p-2.5 border border-gray-400 dark:border-gray-200 rounded-md flex items-center justify-center h-[42px]">
                <Loader />
              </div>
            </div>
          ) : (
            <DropdownSmall
              label="Link to Sale (Optional)"
              items={salesDropdownItems.map((item) => item.label)}
              selected={selectedSaleForDisplay || "None (No Linked Sale)"}
              onSelect={(selectedLabel) => {
                const selectedItem = salesDropdownItems.find(
                  (item) => item.label === selectedLabel
                );
                handleSaleSelection(selectedItem ? selectedItem.value : "None");
              }}
              placeholder="Select a sale to link"
            />
          )}

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
          Billing Address (Optional)
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
            label="Address Line 2"
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

      <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
        <Button
          text="Cancel"
          style="secondary"
          onClick={onClose}
          isDisabled={isLoading || isLoadingSales}
        />
        <Button
          text={isLoading || isLoadingSales ? "Creating..." : "Create Invoice"}
          style="primary"
          type="submit"
          isDisabled={isLoading || isLoadingSales}
        />
      </div>
    </form>
  );
};

export default ReceiptForm;
