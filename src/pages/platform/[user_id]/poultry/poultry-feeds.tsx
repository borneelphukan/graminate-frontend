import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import Table from "@/components/tables/Table";
import { parseISO, format } from "date-fns";
import PoultryFeedsModal from "@/components/modals/PoultryFeedsModal";
import Swal from "sweetalert2"; 

type FeedRecord = {
  feed_id: number;
  user_id: number;
  flock_id: number;
  feed_given: string;
  amount_given: number;
  units: string;
  feed_date: string;
  created_at: string;
};

type FlockData = {
  flock_id: number;
  flock_name: string;
};

// Add ItemRecord type, same as in PoultryFeedsModal
type ItemRecord = {
  inventory_id: number;
  user_id: number;
  item_name: string;
  item_group: string;
  units: string;
  quantity: number;
  created_at: string;
  price_per_unit: number;
  warehouse_id: number | null;
  minimum_limit?: number;
  status?: string;
  feed?: boolean;
};

const PoultryFeedsPage = () => {
  const router = useRouter();
  const { user_id: queryUserId, flock_id: queryFlockId } = router.query;

  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;
  const parsedFlockId = Array.isArray(queryFlockId)
    ? queryFlockId[0]
    : queryFlockId;

  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [availableFeedItems, setAvailableFeedItems] = useState<ItemRecord[]>(
    []
  );
  const [loadingFeedItems, setLoadingFeedItems] = useState(true);

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

  const fetchFeedRecords = useCallback(async () => {
    if (!parsedUserId || !parsedFlockId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get<{ records: FeedRecord[] }>(
        `/poultry-feeds/${parsedUserId}?flockId=${parsedFlockId}`
      );
      setFeedRecords(response.data.records || []);
    } catch (error) {
      console.error("Error fetching feed records:", error);
      setFeedRecords([]);
    } finally {
      setLoading(false);
    }
  }, [parsedUserId, parsedFlockId]);

  const fetchAvailableFeedInventory = useCallback(async () => {
    if (!parsedUserId) {
      setLoadingFeedItems(false);
      return;
    }
    setLoadingFeedItems(true);
    try {
      const response = await axiosInstance.get<{ items: ItemRecord[] }>(
        `/inventory/${parsedUserId}`,
        {
          params: {
            item_group: "Poultry",
          },
        }
      );
      const feedItemsFromInventory = (response.data.items || []).filter(
        (item) => item.feed === true
      );
      setAvailableFeedItems(feedItemsFromInventory);
    } catch (error) {
      console.error("Error fetching available feed items:", error);
      setAvailableFeedItems([]);
    } finally {
      setLoadingFeedItems(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (parsedFlockId) {
      fetchFlockDetails();
    }
    if (parsedUserId && parsedFlockId) {
      fetchFeedRecords();
    }
    if (parsedUserId) {
      fetchAvailableFeedInventory();
    }
  }, [
    parsedUserId,
    parsedFlockId,
    fetchFlockDetails,
    fetchFeedRecords,
    fetchAvailableFeedInventory,
  ]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return feedRecords;
    return feedRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [feedRecords, searchQuery]);

  const handleAddRecord = () => {
    if (loadingFeedItems) {
      Swal.fire({
        title: "Loading...",
        text: "Checking available feed items.",
        icon: "info",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      return;
    }

    if (availableFeedItems.length === 0) {
      Swal.fire({
        title: "No Feed Items",
        text: "Inventory contains no feed items marked for your flocks. Please add or mark items as feed in your inventory first.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    } else {
      setEditingRecord(null);
      setShowFeedModal(true);
    }
  };

  const handleEditRecord = (record: FeedRecord) => {
    setEditingRecord(record);
    setShowFeedModal(true);
  };

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    const recordToEdit = feedRecords.find((r) => r.feed_id === recordId);
    if (recordToEdit) {
      handleEditRecord(recordToEdit);
    }
  };

  const tableData = useMemo(() => {
    const columns = [
      "#",
      "Feed Date",
      "Feed Given",
      "Amount",
      "Units",
      "Logged At",
    ];
    const rows = filteredRecords.map((record) => [
      record.feed_id,
      format(parseISO(record.feed_date), "PP"),
      record.feed_given,
      record.amount_given.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      record.units,
      format(parseISO(record.created_at), "PPpp"),
    ]);
    return { columns, rows };
  }, [filteredRecords]);

  const pageTitle = flockData
    ? `Feed Records (${flockData.flock_name})`
    : "Feed Records";

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
              text="Log Feed"
              onClick={handleAddRecord}
              style="primary"
              isDisabled={loadingFeedItems}
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
          view="poultry_feeds"
          reset={true}
          download={true}
          onRowClick={handleRowClick}
        />
      </div>
      {showFeedModal && parsedUserId && parsedFlockId && (
        <PoultryFeedsModal
          isOpen={showFeedModal}
          onClose={() => {
            setShowFeedModal(false);
            setEditingRecord(null);
          }}
          formTitle={
            editingRecord
              ? `Edit Feed Record for ${flockData?.flock_name || "Flock"}`
              : `Log Feed for ${flockData?.flock_name || "Flock"}`
          }
          flockId={Number(parsedFlockId)}
          userId={Number(parsedUserId)}
          feedRecordToEdit={editingRecord}
          onRecordSaved={() => {
            fetchFeedRecords();
            fetchAvailableFeedInventory();
            setShowFeedModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default PoultryFeedsPage;
