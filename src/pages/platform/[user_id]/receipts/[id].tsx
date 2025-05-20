import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import TextArea from "@/components/ui/TextArea";
import CustomTable from "@/components/tables/CustomTable";
import PlatformLayout from "@/layout/PlatformLayout";
import { triggerToast } from "@/stores/toast";
import Head from "next/head";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";
import axiosInstance from "@/lib/utils/axiosInstance";
import { AxiosError } from "axios";

type Item = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type ApiItem = {
  item_id?: number;
  description: string;
  quantity: number;
  rate: number;
};

type Receipt = {
  invoice_id: string;
  title: string;
  receipt_number: string;
  total: number;
  items: Array<ApiItem>;
  paymentMethod?: "cash" | "card" | "other";
  receipt_date: string;
  bill_to: string;
  payment_terms: string | null;
  due_date: string;
  notes: string | null;
  tax: number;
  discount: number;
  shipping: number;
  bill_to_address_line1: string | null;
  bill_to_address_line2: string | null;
  bill_to_city: string | null;
  bill_to_state: string | null;
  bill_to_postal_code: string | null;
  bill_to_country: string | null;
  user_id: number;
};

const ReceiptDetails = () => {
  const router = useRouter();
  const { user_id, data } = router.query;
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [receiptNumber, setReceiptNumber] = useState("");
  const [mainTitle, setMainTitle] = useState("");
  const [editableReceiptTitle, setEditableReceiptTitle] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);

  const [billToAddressLine1, setBillToAddressLine1] = useState("");
  const [billToAddressLine2, setBillToAddressLine2] = useState("");
  const [billToCity, setBillToCity] = useState("");
  const [billToState, setBillToState] = useState("");
  const [billToPostalCode, setBillToPostalCode] = useState("");
  const [billToCountry, setBillToCountry] = useState("");

  const [dbReceiptDate, setDbReceiptDate] = useState("");

  const [initialFormData, setInitialFormData] = useState({
    receiptNumber: "",
    editableReceiptTitle: "",
    customerName: "",
    paymentTerms: "",
    dueDate: "",
    notes: "",
    items: [] as Item[],
    tax: 0,
    discount: 0,
    shipping: 0,
    billToAddressLine1: "",
    billToAddressLine2: "",
    billToCity: "",
    billToState: "",
    billToPostalCode: "",
    billToCountry: "",
  });

  const [saving, setSaving] = useState(false);

  const transformApiItemsToLocalItems = (apiItems: ApiItem[]): Item[] => {
    if (!apiItems || apiItems.length === 0) {
      return [{ description: "", quantity: 1, rate: 0, amount: 0 }];
    }
    return apiItems.map((item) => ({
      description: item.description || "",
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    }));
  };

  useEffect(() => {
    if (data) {
      try {
        const parsedReceipt = JSON.parse(data as string) as Receipt;
        setReceipt(parsedReceipt);
        setMainTitle(parsedReceipt.title || "");
        setEditableReceiptTitle(parsedReceipt.title || "");
        setReceiptNumber(parsedReceipt.receipt_number || "");

        const formattedDueDate = parsedReceipt.due_date
          ? new Date(parsedReceipt.due_date).toISOString().split("T")[0]
          : "";
        setDueDate(formattedDueDate);
        setCustomerName(parsedReceipt.bill_to || "");
        setPaymentTerms(parsedReceipt.payment_terms || "");
        setNotes(parsedReceipt.notes || "");

        const localItems = transformApiItemsToLocalItems(parsedReceipt.items);
        setItems(localItems);

        setTax(Number(parsedReceipt.tax) || 0);
        setDiscount(Number(parsedReceipt.discount) || 0);
        setShipping(Number(parsedReceipt.shipping) || 0);
        setDbReceiptDate(parsedReceipt.receipt_date || "");

        setBillToAddressLine1(parsedReceipt.bill_to_address_line1 || "");
        setBillToAddressLine2(parsedReceipt.bill_to_address_line2 || "");
        setBillToCity(parsedReceipt.bill_to_city || "");
        setBillToState(parsedReceipt.bill_to_state || "");
        setBillToPostalCode(parsedReceipt.bill_to_postal_code || "");
        setBillToCountry(parsedReceipt.bill_to_country || "");

        setInitialFormData({
          receiptNumber: parsedReceipt.receipt_number || "",
          editableReceiptTitle: parsedReceipt.title || "",
          customerName: parsedReceipt.bill_to || "",
          paymentTerms: parsedReceipt.payment_terms || "",
          dueDate: formattedDueDate,
          notes: parsedReceipt.notes || "",
          items: localItems,
          tax: Number(parsedReceipt.tax) || 0,
          discount: Number(parsedReceipt.discount) || 0,
          shipping: Number(parsedReceipt.shipping) || 0,
          billToAddressLine1: parsedReceipt.bill_to_address_line1 || "",
          billToAddressLine2: parsedReceipt.bill_to_address_line2 || "",
          billToCity: parsedReceipt.bill_to_city || "",
          billToState: parsedReceipt.bill_to_state || "",
          billToPostalCode: parsedReceipt.bill_to_postal_code || "",
          billToCountry: parsedReceipt.bill_to_country || "",
        });
      } catch (error) {
        console.error("Error parsing receipt data:", error);
        triggerToast("Error loading receipt data.", "error");
      }
    }
  }, [data]);

  if (!receipt)
    return (
      <PlatformLayout>
        <div className="p-6 text-center">Loading receipt details...</div>
      </PlatformLayout>
    );

  const hasChanges =
    receiptNumber !== initialFormData.receiptNumber ||
    editableReceiptTitle !== initialFormData.editableReceiptTitle ||
    customerName !== initialFormData.customerName ||
    paymentTerms !== initialFormData.paymentTerms ||
    dueDate !== initialFormData.dueDate ||
    notes !== initialFormData.notes ||
    tax !== initialFormData.tax ||
    discount !== initialFormData.discount ||
    shipping !== initialFormData.shipping ||
    billToAddressLine1 !== initialFormData.billToAddressLine1 ||
    billToAddressLine2 !== initialFormData.billToAddressLine2 ||
    billToCity !== initialFormData.billToCity ||
    billToState !== initialFormData.billToState ||
    billToPostalCode !== initialFormData.billToPostalCode ||
    billToCountry !== initialFormData.billToCountry ||
    JSON.stringify(
      items
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
        }))
        .filter((item) => item.description.trim() !== "")
    ) !==
      JSON.stringify(
        initialFormData.items
          .map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            rate: Number(item.rate),
          }))
          .filter((item) => item.description.trim() !== "")
      );

  const calculateAmounts = () => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    );
    const taxAmount = Math.max(0, (subtotal * (Number(tax) || 0)) / 100);
    const total = Math.max(
      0,
      subtotal + taxAmount - (Number(discount) || 0) + (Number(shipping) || 0)
    );
    return { subtotal, total, taxAmount };
  };

  const handleSave = async () => {
    if (!receipt) return;
    setSaving(true);

    const payload = {
      invoice_id: receipt.invoice_id,
      user_id: receipt.user_id,
      title: editableReceiptTitle,
      receipt_number: receiptNumber,
      bill_to: customerName,
      payment_terms: paymentTerms,
      due_date: dueDate,
      notes,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      shipping: Number(shipping) || 0,
      items: items
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        }))
        .filter((item) => item.description && item.description.trim() !== ""),
      bill_to_address_line1: billToAddressLine1,
      bill_to_address_line2: billToAddressLine2,
      bill_to_city: billToCity,
      bill_to_state: billToState,
      bill_to_postal_code: billToPostalCode,
      bill_to_country: billToCountry,
    };

    try {
      const response = await axiosInstance.put("/receipts/update", payload);
      triggerToast("Invoice updated successfully", "success");

      const updatedApiReceipt = response.data.invoice as Receipt;
      setReceipt(updatedApiReceipt);
      setMainTitle(updatedApiReceipt.title || "");

      const updatedLocalItems = transformApiItemsToLocalItems(
        updatedApiReceipt.items || []
      );
      setItems(updatedLocalItems);

      setInitialFormData({
        receiptNumber,
        editableReceiptTitle,
        customerName,
        paymentTerms,
        dueDate,
        notes,
        items: updatedLocalItems,
        tax: Number(tax) || 0,
        discount: Number(discount) || 0,
        shipping: Number(shipping) || 0,
        billToAddressLine1,
        billToAddressLine2,
        billToCity,
        billToState,
        billToPostalCode,
        billToCountry,
      });
    } catch (error: unknown) {
      console.error("Error updating receipt:", error);
      const axiosError = error as AxiosError;
      const errorMessage =
        (axiosError.response?.data as { error?: string })?.error ||
        "An error occurred while updating the invoice.";
      triggerToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleItemsChange = (newItemsFromTable: Item[]) => {
    setItems(newItemsFromTable);
  };

  const handleDownload = async () => {
    const element = document.getElementById("receipt-container-content");
    if (!element) {
      triggerToast("Receipt content not found for PDF generation.", "error");
      return;
    }

    const buttonsToHide = document.querySelectorAll(".exclude-from-pdf-view");
    buttonsToHide.forEach(
      (btn) => ((btn as HTMLElement).style.visibility = "hidden")
    );

    try {
      const scale = 2;
      const imgData = await domtoimage.toPng(element, {
        quality: 0.98,
        bgcolor: "#ffffff",
        width: element.scrollWidth * scale,
        height: element.scrollHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${element.scrollWidth}px`,
          height: `${element.scrollHeight}px`,
        },
      });

      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width / scale;
      const imgHeight = imgProps.height / scale;

      const aspectRatio = imgWidth / imgHeight;

      let finalImgWidth = pdfWidth - 2 * margin;
      let finalImgHeight = finalImgWidth / aspectRatio;

      if (finalImgHeight > pdfHeight - 2 * margin) {
        finalImgHeight = pdfHeight - 2 * margin;
        finalImgWidth = finalImgHeight * aspectRatio;
      }

      const currentY = margin;
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        currentY,
        finalImgWidth,
        finalImgHeight
      );

      pdf.save(`${receiptNumber || "invoice"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      triggerToast(
        "Could not generate PDF. Check console for details.",
        "error"
      );
    } finally {
      buttonsToHide.forEach(
        (btn) => ((btn as HTMLElement).style.visibility = "visible")
      );
    }
  };

  const currentCalculatedAmounts = calculateAmounts();

  return (
    <PlatformLayout>
      <Head>
        <title>{mainTitle || "Invoice"} | CRM</title>
      </Head>
      <div className="px-4 sm:px-6 pb-10">
        <div className="pt-4 exclude-from-pdf-view">
          <Button
            text="Back to Invoices"
            style="ghost"
            arrow="left"
            onClick={() =>
              router.push(`/platform/${user_id}/crm?view=receipts`)
            }
          />
        </div>
        <div
          id="receipt-container-content"
          className="pt-4 bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sm:p-8 my-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b dark:border-gray-700 mb-6">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {mainTitle || "INVOICE"}
              </h1>
            </div>
            <div className="text-left sm:text-right text-gray-600 dark:text-gray-400">
              <h2 className="text-xl font-semibold">
                Invoice #{receiptNumber || "N/A"}
              </h2>
              <p className="text-sm">
                Date Issued:{" "}
                <span className="font-semibold">
                  {dbReceiptDate
                    ? new Date(dbReceiptDate).toLocaleDateString()
                    : "N/A"}
                </span>
              </p>
              <p className="text-sm">
                Due Date:{" "}
                <span className="font-semibold">
                  {dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <TextField
                  label="Invoice Purpose / Title"
                  value={editableReceiptTitle}
                  onChange={setEditableReceiptTitle}
                  width="large"
                  placeholder="e.g. Website Design Services"
                />
                <TextField
                  label="Payment Terms"
                  value={paymentTerms}
                  onChange={setPaymentTerms}
                  width="large"
                  placeholder="e.g. Net 30, Due on Receipt"
                />
              </div>
              <TextArea
                label="Notes / Comments"
                value={notes}
                onChange={setNotes}
                placeholder="Any additional notes for the customer..."
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-dark dark:text-light">
                Bill To:
              </h3>
              <TextField
                label="Customer Name"
                value={customerName}
                onChange={setCustomerName}
                width="large"
                placeholder="Customer Full Name or Company"
              />
              <TextField
                label="Address Line 1"
                value={billToAddressLine1}
                onChange={setBillToAddressLine1}
                width="large"
                placeholder="Street Address Line 1"
              />
              <TextField
                label="Address Line 2"
                value={billToAddressLine2}
                onChange={setBillToAddressLine2}
                width="large"
                placeholder="Apt, Suite, Building (Optional)"
              />
              <div className="flex space-x-3 space-y-3">
                <TextField
                  label="City"
                  value={billToCity}
                  onChange={setBillToCity}
                  placeholder="City"
                />
                <TextField
                  label="State"
                  value={billToState}
                  onChange={setBillToState}
                  placeholder="State/Province"
                />
              </div>
              <div className="flex space-x-3">
                <TextField
                  label="Postal Code"
                  value={billToPostalCode}
                  onChange={setBillToPostalCode}
                  placeholder="Postal Code"
                />
                <TextField
                  label="Country"
                  value={billToCountry}
                  onChange={setBillToCountry}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <CustomTable items={items} onItemsChange={handleItemsChange} />
          </div>

          <div className="w-full mb-8">
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">
                    ₹{currentCalculatedAmounts.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="mr-2">Tax (%):</span>
                  <TextField
                    value={tax.toString()}
                    onChange={(val) =>
                      setTax(Number(val.replace(/[^0-9.]/g, "")) || 0)
                    }
                    width="small"
                  />
                  <span className="font-semibold ml-auto">
                    ₹{currentCalculatedAmounts.taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="mr-2">Discount (₹):</span>
                  <TextField
                    value={discount.toString()}
                    onChange={(val) =>
                      setDiscount(Number(val.replace(/[^0-9.]/g, "")) || 0)
                    }
                    width="small"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="mr-2">Shipping (₹):</span>
                  <TextField
                    value={shipping.toString()}
                    onChange={(val) =>
                      setShipping(Number(val.replace(/[^0-9.]/g, "")) || 0)
                    }
                    width="small"
                  />
                </div>
                <div className="border-t dark:border-gray-700 my-2"></div>
                <div className="flex justify-between text-xl font-bold text-gray-800 dark:text-gray-100">
                  <span>Total:</span>
                  <span>₹{currentCalculatedAmounts.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row mt-10 space-y-3 sm:space-y-0 sm:space-x-4 exclude-from-pdf-view">
          <Button
            text={saving ? "Updating..." : "Update Invoice"}
            style="primary"
            onClick={handleSave}
            isDisabled={!hasChanges || saving}
          />
          <div className="hidden md:block w-full sm:w-auto">
            <Button
              text="Download PDF"
              style="primary"
              onClick={handleDownload}
            />
          </div>
          <Button
            text="Cancel"
            style="secondary"
            onClick={() =>
              router.push(`/platform/${user_id}/crm?view=receipts`)
            }
          />
        </div>
      </div>
    </PlatformLayout>
  );
};

export default ReceiptDetails;
