import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import Button from "@/components/ui/Button";
import Table from "@/components/tables/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMobileScreen,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import SalaryModal from "@/components/modals/SalaryModal";
import axiosInstance from "@/lib/utils/axiosInstance";

type Labour = {
  labour_id: number;
  full_name: string;
  contact_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

type PaymentRecord = {
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

const LabourPaymentDetails = () => {
  const router = useRouter();
  const { user_id, id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const parsedLabourId = Array.isArray(id) ? id[0] : id;

  const [labourName, setLabourName] = useState<string>("");
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [contact, setContact] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const PAGINATION_ITEMS = ["25 per page", "50 per page", "100 per page"];

  useEffect(() => {
    if (!router.isReady || !parsedUserId || !parsedLabourId) return;

    const fetchData = async () => {
      try {
        const response = await axiosInstance.get(`/labour/${parsedUserId}`);
        const labours = response.data.labours || [];
        const labour = labours.find(
          (l: Labour) => l.labour_id === Number(parsedLabourId)
        );

        if (labour) {
          setLabourName(labour.full_name);
          setContact(labour.contact_number || "");
          setAddress(
            [
              labour.address_line_1,
              labour.address_line_2,
              labour.city,
              labour.state,
              labour.postal_code,
            ]
              .filter(Boolean)
              .join(", ")
          );
        }

        try {
          const response = await axiosInstance.get(
            `/labour_payment/${parsedLabourId}`
          );

          const payments =
            response.data.payments || response.data.data?.payments || [];
          setPaymentRecords(payments);
        } catch (err: unknown) {
          console.warn(
            "Error fetching payments:",
            err instanceof Error ? err.message : String(err)
          );
          setPaymentRecords([]);
        }
      } catch (error: unknown) {
        console.error(
          "Error fetching data:",
          error instanceof Error ? error.message : String(error)
        );
      }
    };

    fetchData();
  }, [router.isReady, parsedUserId, parsedLabourId]);

  const tableData = useMemo(() => {
    return {
      columns: [
        "Payment Date",
        "Base Salary",
        "Bonus",
        "Overtime Pay",
        "Housing Allowance",
        "Travel Allowance",
        "Meal Allowance",
        "Total Salary",
        "Payment Status",
      ],
      rows: paymentRecords.map((p) => [
        new Date(p.payment_date).toLocaleDateString(),
        p.salary_paid,
        p.bonus,
        p.overtime_pay,
        p.housing_allowance,
        p.travel_allowance,
        p.meal_allowance,
        p.total_amount,
        p.payment_status,
      ]),
    };
  }, [paymentRecords]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return tableData.rows;
    return tableData.rows.filter((row) =>
      row.some((cell) =>
        String(cell).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, tableData.rows]);

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Salary Details</title>
      </Head>
      <Button
        text="Back"
        style="ghost"
        arrow="left"
        onClick={() => router.push(`/platform/${parsedUserId}/labour_payment`)}
      />
      <div className="min-h-screen container mx-auto px-4">
        <div className="flex flex-row items-start justify-between mt-4">
          <h1 className="text-lg font-semibold dark:text-white">
            Salary Details
          </h1>
          <Button
            text="Add Salary"
            style="primary"
            add
            onClick={() => {
              setSelectedRecord(null);
              setShowSalaryModal(true);
            }}
          />
        </div>

        <div className="flex flex-row gap-6 items-start mt-2 space-y-1">
          <p className="text-sm text-dark dark:text-light">
            <span className="font-semibold mr-2">
              <FontAwesomeIcon icon={faUser} />
            </span>
            {labourName}
          </p>
          <p className="text-sm text-dark dark:text-light">
            <span className="font-semibold mr-2">
              <FontAwesomeIcon icon={faMobileScreen} />
            </span>
            {contact}
          </p>
          <p className="text-sm text-dark dark:text-light">
            <span className="font-semibold mr-2">
              <FontAwesomeIcon icon={faHome} />
            </span>
            {address}
          </p>
        </div>

        <Table
          view="labour_payment"
          data={tableData}
          filteredRows={filteredRows}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          paginationItems={PAGINATION_ITEMS}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecordCount={tableData.rows.length}
          onRowClick={(row) => {
            const payment = paymentRecords.find(
              (p) => new Date(p.payment_date).toLocaleDateString() === row[0]
            );
            if (payment) {
              setSelectedRecord(payment);
              setShowSalaryModal(true);
            }
          }}
          reset={false}
          hideChecks={true}
        />

        {showSalaryModal && (
          <SalaryModal
            labourId={parsedLabourId || ""}
            editMode={!!selectedRecord}
            initialData={selectedRecord || undefined}
            onClose={() => {
              setShowSalaryModal(false);
              setSelectedRecord(null);
            }}
            onSuccess={() => router.replace(router.asPath)}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default LabourPaymentDetails;
