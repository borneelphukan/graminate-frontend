import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import Table from "@/components/tables/Table";

import { parseISO, format } from "date-fns";
import EggModal from "@/components/modals/poultry/EggModal";


type EggRecord = {
  egg_id: number;
  user_id: number;
  flock_id: number;
  date_collected: string;
  small_eggs: number;
  medium_eggs: number;
  large_eggs: number;
  extra_large_eggs: number;
  total_eggs: number;
  broken_eggs: number;
  date_logged: string;
};

type FlockData = {
  flock_id: number;
  flock_name: string;
};

const PoultryEggCollection = () => {
  const router = useRouter();
  const { user_id: queryUserId, flock_id: queryFlockId } = router.query;

  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;
  const parsedFlockId = Array.isArray(queryFlockId)
    ? queryFlockId[0]
    : queryFlockId;

  const [eggRecords, setEggRecords] = useState<EggRecord[]>([]);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEggModal, setShowEggModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EggRecord | null>(null);

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

  const fetchEggRecords = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get<{ records: EggRecord[] }>(
        `/poultry-eggs/${parsedUserId}?flockId=${parsedFlockId}`
      );
      setEggRecords(response.data.records || []);
    } catch (error) {
      console.error("Error fetching egg records:", error);
      setEggRecords([]);
    } finally {
      setLoading(false);
    }
  }, [parsedUserId, parsedFlockId]);

  useEffect(() => {
    if (parsedFlockId) {
      fetchFlockDetails();
    }
    if (parsedUserId && parsedFlockId) {
      fetchEggRecords();
    }
  }, [parsedUserId, parsedFlockId, fetchFlockDetails, fetchEggRecords]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return eggRecords;
    return eggRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [eggRecords, searchQuery]);

  const handleAddRecord = () => {
    setEditingRecord(null);
    setShowEggModal(true);
  };

  const handleEditRecord = (record: EggRecord) => {
    setEditingRecord(record);
    setShowEggModal(true);
  };

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    const recordToEdit = eggRecords.find((r) => r.egg_id === recordId);
    if (recordToEdit) {
      handleEditRecord(recordToEdit);
    }
  };

  const tableData = useMemo(() => {
    const columns = [
      "#",
      "Date Collected",
      "Small",
      "Medium",
      "Large",
      "XL",
      "Total",
      "Broken",
      "Date Logged",
    ];
    const rows = filteredRecords.map((record) => [
      record.egg_id,
      format(parseISO(record.date_collected), "PP"),
      record.small_eggs,
      record.medium_eggs,
      record.large_eggs,
      record.extra_large_eggs,
      record.total_eggs,
      record.broken_eggs,
      format(parseISO(record.date_logged), "PPpp"),
    ]);
    return { columns, rows };
  }, [filteredRecords]);

  const pageTitle = flockData
    ? `Egg Grading Records (${flockData.flock_name})`
    : "Egg Grading Records";

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
              text="Dashboard"
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
              text="Log Egg Collection"
              onClick={handleAddRecord}
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
          paginationItems={["25 per page", "50 per page", "100 per page"]}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecordCount={filteredRecords.length}
          loading={loading}
          view="poultry_eggs"
          reset={true}
          download={true}
          onRowClick={handleRowClick}
        />
      </div>
      {showEggModal && parsedUserId && parsedFlockId && (
        <EggModal
          isOpen={showEggModal}
          onClose={() => {
            setShowEggModal(false);
            setEditingRecord(null);
          }}
          formTitle={
            editingRecord
              ? `Edit Egg Record for ${flockData?.flock_name || "Flock"}`
              : `Log Egg Collection for ${flockData?.flock_name || "Flock"}`
          }
          flockId={Number(parsedFlockId)}
          userId={Number(parsedUserId)}
          eggRecordToEdit={editingRecord}
          onRecordSaved={() => {
            fetchEggRecords();
            setShowEggModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default PoultryEggCollection;
