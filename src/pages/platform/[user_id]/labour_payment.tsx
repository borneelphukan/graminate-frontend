import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import Table from "@/components/tables/Table";
import axiosInstance from "@/lib/utils/axiosInstance";

type Labour = {
  id: string | number;
  labour_id: string | number;
  full_name: string;
  base_salary: number;
  bonus: number | null;
  overtime_pay: number | null;
  housing_allowance: number | null;
  travel_allowance: number | null;
  meal_allowance: number | null;
  payment_frequency: string | null;
  role: string | null;
  aadhar_card_number: string;
  contact_number: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  created_at: string;
};

type PaymentRecord = {
  payment_id: number;
  labour_id: string | number;
  payment_date: string;
  salary_paid: number;
  bonus: number;
  overtime_pay: number;
  housing_allowance: number;
  travel_allowance: number;
  meal_allowance: number;
  total_amount: number;
  payment_status: "Pending" | "Paid" | "Failed" | string;
};

const LabourPayment = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;

  const [labourList, setLabourList] = useState<Labour[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !parsedUserId) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const labourResponse = await axiosInstance.get(
          `/labour/${parsedUserId}`
        );
        const fetchedLabours: Labour[] = labourResponse.data.labours || [];
        if (!isMounted) return;
        setLabourList(fetchedLabours);

        const allPayments: PaymentRecord[] = [];
        await Promise.allSettled(
          fetchedLabours.map(async (labour: Labour) => {
            try {
              const paymentResponse = await axiosInstance.get(
                `/labour_payment/${labour.labour_id}`
              );

              const payments =
                paymentResponse.data.payments ||
                paymentResponse.data.data?.payments ||
                [];
              if (Array.isArray(payments)) {
                allPayments.push(...payments);
              }
            } catch (error: unknown) {
              console.error(
                `Error fetching payments for labour ${labour.labour_id}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          })
        );

        if (isMounted) {
          setPaymentRecords(allPayments);
        }
      } catch (error: unknown) {
        const getErrorMessage = (err: unknown): string => {
          if (typeof err === "object" && err !== null) {
            const apiError = err as {
              response?: { data?: { error?: string } };
            };
            if (apiError.response?.data?.error) {
              return apiError.response.data.error;
            }

            const standardError = err as { message?: string };
            if (standardError.message) {
              return standardError.message;
            }
          }
          return "An unexpected error occurred fetching data.";
        };
        console.error("Error fetching data:", getErrorMessage(error));
        if (isMounted) {
          setLabourList([]);
          setPaymentRecords([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, parsedUserId]);

  const currentMonthLabours = useMemo(() => {
    return labourList.filter((labour) => {
      const date = new Date(labour.created_at);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });
  }, [labourList, currentMonth, currentYear]);

  const basicSalaryToPay = useMemo(() => {
    return currentMonthLabours.reduce(
      (sum, labour) => sum + Number(labour.base_salary || 0),
      0
    );
  }, [currentMonthLabours]);

  const combinedSalaryToPay = useMemo(() => {
    return currentMonthLabours.reduce((sum, labour) => {
      const combined =
        Number(labour.base_salary || 0) +
        Number(labour.bonus || 0) +
        Number(labour.overtime_pay || 0) +
        Number(labour.housing_allowance || 0) +
        Number(labour.travel_allowance || 0) +
        Number(labour.meal_allowance || 0);
      return sum + combined;
    }, 0);
  }, [currentMonthLabours]);

  const totalPaid = useMemo(() => {
    return paymentRecords
      .filter((p) => (p.payment_status || "").toLowerCase() === "paid")
      .reduce((sum, p) => {
        const amount =
          typeof p.total_amount === "string"
            ? parseFloat(p.total_amount)
            : typeof p.total_amount === "number"
            ? p.total_amount
            : 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
  }, [paymentRecords]);

  const remainingCombinedToPay = useMemo(() => {
    return Math.max(0, combinedSalaryToPay - totalPaid);
  }, [combinedSalaryToPay, totalPaid]);

  const tableData = useMemo(() => {
    return {
      columns: [
        "#",
        "Employee",
        "Role",
        "Basic Salary",
        "Phone No.",
        "Aadhar Card No.",
      ],
      rows: labourList.map((labour) => [
        labour.labour_id,
        labour.full_name,
        labour.role ?? "N/A",
        labour.base_salary ?? "N/A",
        labour.contact_number ?? "N/A",
        labour.aadhar_card_number ?? "N/A",
      ]),
    };
  }, [labourList]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return tableData.rows;
    return tableData.rows.filter((row) =>
      row.some((cell) =>
        String(cell).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, tableData.rows]);

  const PAGINATION_ITEMS = ["25 per page", "50 per page", "100 per page"];

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Employee Payroll</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center dark:bg-dark relative mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Salary Manager
            </h1>
            <p className="text-sm text-gray-300">
              Summary based on employees added this month.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Basic Salary Confirmed
            </h2>
            <p className="text-xl font-bold text-dark dark:text-white">
              ₹ {basicSalaryToPay.toFixed(2)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Overall Salary Due
            </h2>
            <p className="text-xl font-bold text-dark dark:text-white">
              ₹ {combinedSalaryToPay.toFixed(2)}
            </p>
            <p className="text-xs text-gray-300">
              (Base + Allowances + Bonus etc.)
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Salary Paid
            </h2>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              ₹ {totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-gray-300">(Based on Paid records)</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Salary Due
            </h2>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              ₹ {remainingCombinedToPay.toFixed(2)}
            </p>
          </div>
        </div>

        <h2 className="text-md font-semibold dark:text-white mb-2 mt-6">
          Employee List
        </h2>
        <Table
          view="labour_payment_list"
          data={tableData}
          filteredRows={filteredRows}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          paginationItems={PAGINATION_ITEMS}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecordCount={labourList.length}
          loading={loading}
          onRowClick={(row) => {
            const labourId = row[0];
            if (labourId !== undefined && labourId !== null) {
              router.push({
                pathname: `/platform/${parsedUserId}/labour_payment/${labourId}`,
              });
            } else {
              console.error("Labour ID is missing for the clicked row:", row);
            }
          }}
          reset={false}
          hideChecks={true}
          download={false}
        />
      </div>
    </PlatformLayout>
  );
};

export default LabourPayment;
