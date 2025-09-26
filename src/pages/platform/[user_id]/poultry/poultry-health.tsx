import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import Table from "@/components/tables/Table";
import VeterinaryForm from "@/components/form/poultry/VeterinaryForm";

type PoultryHealthRecord = {
  poultry_health_id: number;
  user_id: number;
  flock_id: number;
  veterinary_name?: string;
  total_birds: number;
  birds_vaccinated: number;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
  created_at: string;
};

type FlockData = {
  flock_id: number;
  flock_name: string;
};

const PoultryHealth = () => {
  const router = useRouter();
  const { user_id: queryUserId, flock_id: queryFlockId } = router.query;

  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;
  const parsedFlockId = Array.isArray(queryFlockId)
    ? queryFlockId[0]
    : queryFlockId;

  const [healthRecords, setHealthRecords] = useState<PoultryHealthRecord[]>([]);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVeterinaryForm, setShowVeterinaryForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchFlockDetails = useCallback(async () => {
    if (!parsedFlockId) return;
    try {
      const response = await axiosInstance.get(`/flock/${parsedFlockId}`);
      setFlockData(response.data);
    } catch (error) {
      console.error("Error fetching flock details:", error);
      setFlockData(null);
    }
  }, [parsedFlockId]);

  const fetchHealthRecords = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get<{
        records: PoultryHealthRecord[];
      }>(`/poultry-health/${parsedUserId}?flockId=${parsedFlockId}`);
      setHealthRecords(response.data.records || []);
    } catch (error) {
      console.error("Error fetching poultry health records:", error);
      setHealthRecords([]);
    } finally {
      setLoading(false);
    }
  }, [parsedUserId, parsedFlockId]);

  useEffect(() => {
    if (parsedFlockId) {
      fetchFlockDetails();
    }
    if (parsedUserId && parsedFlockId) {
      fetchHealthRecords();
    }
  }, [parsedUserId, parsedFlockId, fetchFlockDetails, fetchHealthRecords]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return healthRecords;
    return healthRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [healthRecords, searchQuery]);

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    if (recordId && parsedUserId && parsedFlockId) {
      router.push(
        `/platform/${parsedUserId}/poultry/poultry-health/${recordId}?flock_id=${parsedFlockId}`
      );
    }
  };

  const tableData = useMemo(() => {
    const columns = [
      "#",
      "Date Logged",
      "Veterinary Name",
      "Total Birds",
      "Birds Vaccinated",
      "Vaccines",
      "Next Appointment",
    ];
    const rows = filteredRecords.map((record) => [
      record.poultry_health_id,
      new Date(record.created_at).toLocaleDateString(),
      record.veterinary_name || "N/A",
      record.total_birds,
      record.birds_vaccinated,
      record.vaccines_given?.join(", ") || "N/A",
      record.next_appointment
        ? new Date(record.next_appointment).toLocaleDateString()
        : "N/A",
    ]);
    return { columns, rows };
  }, [filteredRecords]);

  const pageTitle = flockData
    ? `Veterinary Records (${flockData.flock_name})`
    : "";

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | {pageTitle}</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center dark:bg-dark relative mb-4">
          <div className="flex items-center gap-1">
            <div className="flex flex-col mb-3 sm:mb-0">
              <h1 className="text-lg font-semibold dark:text-white">
                {pageTitle}
              </h1>
              <p className="text-xs text-dark dark:text-light mt-1">
                {loading
                  ? "Loading records..."
                  : `${filteredRecords.length} Record(s) found ${
                      searchQuery ? "(filtered)" : ""
                    }`}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-3 sm:mt-0">
            <Button
              arrow="left"
              text=" Dashboard"
              onClick={() => {
                if (parsedUserId && parsedFlockId) {
                  router.push(
                    `/platform/${parsedUserId}/poultry/${parsedFlockId}`
                  );
                }
              }}
              style="secondary"
            />
            <Button
              text="Log Health Data"
              onClick={() => setShowVeterinaryForm(true)}
              style="primary"
            />
          </div>
        </div>

        <Table
          data={tableData}
          filteredRows={tableData.rows}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          paginationItems={["10 per page", "25 per page", "50 per page", "100 per page"]}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecordCount={filteredRecords.length}
          loading={loading}
          view="poultry_health"
          reset={true}
          download={true}
          onRowClick={handleRowClick}
        />
      </div>
      {showVeterinaryForm && (
        <VeterinaryForm
          onClose={() => {
            setShowVeterinaryForm(false);
            fetchHealthRecords();
          }}
          formTitle={`Log Health Data for ${flockData?.flock_name || "Flock"}`}
          flockId={Number(parsedFlockId)}
        />
      )}
    </PlatformLayout>
  );
};

export default PoultryHealth;
