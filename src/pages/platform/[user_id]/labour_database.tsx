import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import Table from "@/components/tables/Table";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS } from "@/constants/options";
import Head from "next/head";
import LabourForm from "@/components/form/LabourForm";
import axiosInstance from "@/lib/utils/axiosInstance";

type View = "labour";

type LabourRecord = {
  labour_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  role: string;
  contact_number: string;
  aadhar_card_number: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
};

const LabourDatabase = () => {
  const router = useRouter();
  const { user_id, view: queryView } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const view: View =
    typeof queryView === "string" ? (queryView as View) : "labour";

  const [labourRecords, setLabourRecords] = useState<LabourRecord[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!router.isReady || !parsedUserId) return;

    const fetchLabours = async () => {
      try {
        const response = await axiosInstance.get(
          `/labour/${encodeURIComponent(parsedUserId)}`
        );

        setLabourRecords(response.data.labours || []);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error fetching labour data:", error.message);
        } else {
          console.error("Unknown error fetching labour data");
        }
      }
    };

    fetchLabours();
  }, [router.isReady, parsedUserId]);

  const tableData = useMemo(() => {
    if (view === "labour" && labourRecords.length > 0) {
      return {
        columns: [
          "#",
          "Full Name",
          "Birth Date",
          "Gender",
          "Role",
          "Phone Number",
          "Aadhar Card",
          "Address",
          "Added On",
        ],
        rows: labourRecords.map((item) => [
          item.labour_id,
          item.full_name,
          new Date(item.date_of_birth).toLocaleDateString(),
          item.gender,
          item.role,
          item.contact_number,
          item.aadhar_card_number,
          [
            item.address_line_1,
            item.address_line_2,
            item.city,
            item.state,
            item.postal_code,
          ]
            .filter(Boolean)
            .join(", "),
          new Date(item.created_at).toDateString(),
        ]),
      };
    }
    return { columns: [], rows: [] };
  }, [labourRecords, view]);

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Employee Database</title>
      </Head>
      <div className="min-h-screen container mx-auto py-4">
        <div className="flex justify-between items-center dark:bg-dark relative mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Employee Database
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {labourRecords.length} Record(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              text="View Salaries"
              style="primary"
              onClick={() =>
                router.push(`/platform/${parsedUserId}/labour_payment`)
              }
            />
            <Button
              text="Add Employee"
              style="primary"
              add
              onClick={() => setIsSidebarOpen(true)}
            />
          </div>
        </div>

        <Table
          data={{ ...tableData, rows: tableData.rows }}
          filteredRows={tableData.rows}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          paginationItems={PAGINATION_ITEMS}
          searchQuery={searchQuery}
          totalRecordCount={tableData.rows.length}
          onRowClick={(row) => {
            const labourId = row[0];
            const labour = labourRecords.find(
              (item) => item.labour_id === labourId
            );
            if (labour) {
              router.push({
                pathname: `/platform/${parsedUserId}/labour_database/${labourId}`,
                query: { data: JSON.stringify(labour) },
              });
            }
          }}
          view={view}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          setSearchQuery={setSearchQuery}
        />

        {isSidebarOpen && (
          <LabourForm
            view="labour"
            onClose={() => setIsSidebarOpen(false)}
            onSubmit={() => {
              setIsSidebarOpen(false);
            }}
            formTitle="Add Labour"
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default LabourDatabase;
