
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import { format, parseISO } from "date-fns";
import CattleMilkModal, {
  MilkRecord,
} from "@/components/modals/CattleMilkModal";
import Table from "@/components/tables/Table";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";

type CattleMilkRecordFromApi = {
  milk_id: number;
  cattle_id: number;
  user_id: number;
  date_collected: string;
  animal_name: string | null;
  milk_produced: string;
  date_logged: string;
};

type CattleForDropdown = {
  cattle_id: number;
  cattle_name: string;
};

const paginationItems = ["25 per page", "50 per page", "100 per page"];

const mapSupportedLanguageToLocale = (lang: SupportedLanguage): string => {
  switch (lang) {
    case "English":
      return "en";
    case "Hindi":
      return "hi";
    case "Assamese":
      return "as";
    default:
      return "en";
  }
};

const CattleMilkPage = () => {
  const router = useRouter();
  const { user_id: userIdFromRoute, cattleId: cattleIdFromQuery } =
    router.query;

  const { timeFormat, language: currentLanguage } = useUserPreferences();

  const parsedUserId = Array.isArray(userIdFromRoute)
    ? userIdFromRoute[0]
    : userIdFromRoute;
  const initialCattleIdFromQuery = Array.isArray(cattleIdFromQuery)
    ? cattleIdFromQuery[0]
    : cattleIdFromQuery;

  const [milkRecords, setMilkRecords] = useState<CattleMilkRecordFromApi[]>([]);
  const [allUserCattle, setAllUserCattle] = useState<CattleForDropdown[]>([]);
  const [currentCattleData, setCurrentCattleData] =
    useState<CattleForDropdown | null>(null);
  const [selectedCattleId, setSelectedCattleId] = useState<string | undefined>(
    initialCattleIdFromQuery
  );

  const [loadingUserCattle, setLoadingUserCattle] = useState(true);
  const [loadingMilkRecords, setLoadingMilkRecords] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMilkModal, setShowMilkModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MilkRecord | null>(null);

  useEffect(() => {
    if (!parsedUserId) {
      setAllUserCattle([]);
      setSelectedCattleId(undefined);
      setCurrentCattleData(null);
      setLoadingUserCattle(false);
      setLoadingMilkRecords(false);
      return;
    }
    setLoadingUserCattle(true);
    axiosInstance
      .get(`/cattle-rearing/user/${parsedUserId}`)
      .then((response) => {
        const fetchedCattle: CattleForDropdown[] =
          response.data.cattleRearings || [];
        setAllUserCattle(fetchedCattle);
        if (
          initialCattleIdFromQuery &&
          fetchedCattle.some(
            (c) => c.cattle_id.toString() === initialCattleIdFromQuery
          )
        ) {
          setSelectedCattleId(initialCattleIdFromQuery);
        } else if (fetchedCattle.length > 0) {
          setSelectedCattleId(fetchedCattle[0].cattle_id.toString());
        } else {
          setSelectedCattleId(undefined);
          setCurrentCattleData(null);
          setMilkRecords([]);
          setLoadingMilkRecords(false);
        }
      })
      .catch((error) => {
        console.error("Error fetching user cattle:", error);
        setAllUserCattle([]);
        setSelectedCattleId(undefined);
        setCurrentCattleData(null);
      })
      .finally(() => {
        setLoadingUserCattle(false);
      });
  }, [parsedUserId, initialCattleIdFromQuery]);

  const fetchMilkRecordsAndRelatedData = useCallback(async () => {
    if (!selectedCattleId || allUserCattle.length === 0 || !parsedUserId) {
      setCurrentCattleData(
        allUserCattle.find(
          (c) => c.cattle_id.toString() === selectedCattleId
        ) || null
      );
      setMilkRecords([]);
      setLoadingMilkRecords(false);
      if (router.query.cattleId && !selectedCattleId) {
        const newQuery = { ...router.query };
        delete newQuery.cattleId;
        router.push({ pathname: router.pathname, query: newQuery }, undefined, {
          shallow: true,
        });
      }
      return;
    }

    setLoadingMilkRecords(true);
    const foundCattle = allUserCattle.find(
      (c) => c.cattle_id.toString() === selectedCattleId
    );
    setCurrentCattleData(foundCattle || null);

    if (!foundCattle) {
      setMilkRecords([]);
      setLoadingMilkRecords(false);
      return;
    }

    if (
      selectedCattleId !== initialCattleIdFromQuery ||
      router.query.cattleId !== selectedCattleId
    ) {
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, cattleId: selectedCattleId },
        },
        undefined,
        { shallow: true }
      );
    }

    try {
      const response = await axiosInstance.get<{
        cattleMilkRecords: CattleMilkRecordFromApi[];
      }>(`/cattle-milk/cattle/${selectedCattleId}`);
      setMilkRecords(response.data.cattleMilkRecords || []);
    } catch (error) {
      console.error("Error fetching milk records:", error);
      setMilkRecords([]);
    } finally {
      setLoadingMilkRecords(false);
    }
  }, [
    selectedCattleId,
    allUserCattle,
    parsedUserId,
    initialCattleIdFromQuery,
    router,
  ]);

  useEffect(() => {
    if (!loadingUserCattle) {
      fetchMilkRecordsAndRelatedData();
    }
  }, [selectedCattleId, loadingUserCattle, fetchMilkRecordsAndRelatedData]);

  const handleAddRecord = () => {
    setEditingRecord(null);
    setShowMilkModal(true);
  };

  const handleEditRecord = (record: MilkRecord) => {
    setEditingRecord(record);
    setShowMilkModal(true);
  };

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    const originalRecord = milkRecords.find((r) => r.milk_id === recordId);
    if (originalRecord) {
      handleEditRecord({
        milk_id: originalRecord.milk_id,
        cattle_id: originalRecord.cattle_id,
        date_collected: originalRecord.date_collected,
        animal_name: originalRecord.animal_name,
        milk_produced: parseFloat(originalRecord.milk_produced),
      });
    }
  };

  const filteredMilkRecords = useMemo(() => {
    if (!searchQuery) return milkRecords;
    return milkRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [milkRecords, searchQuery]);

  const tableData = useMemo(() => {
    const locale = mapSupportedLanguageToLocale(currentLanguage);
    const dateTimeOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: timeFormat === "12-hour",
    };

    const columns = [
      "ID",
      "Date Collected",
      "Animal Name/ID",
      "Milk Produced (L)",
      "Date Logged",
    ];
    const rows = filteredMilkRecords.map((record) => [
      record.milk_id,
      format(parseISO(record.date_collected), "PP"),
      record.animal_name || "N/A",
      parseFloat(record.milk_produced).toFixed(2),
      new Date(parseISO(record.date_logged)).toLocaleString(
        locale,
        dateTimeOptions
      ),
    ]);
    return { columns, rows };
  }, [filteredMilkRecords, currentLanguage, timeFormat]);

  const pageTitle = currentCattleData
    ? `Milk Logs (${currentCattleData.cattle_name})`
    : "Milk Production Logs";

  if (!parsedUserId && !loadingUserCattle) {
    return (
      <PlatformLayout>
        <Head>
          <title>Graminate | Milk Production</title>
        </Head>
        <div className="p-4 text-center">
          <p>User information not available.</p>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | {pageTitle}</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              {pageTitle}
            </h1>
            <p className="text-xs text-dark dark:text-light mt-1">
              {loadingUserCattle
                ? "Loading herd details..."
                : loadingMilkRecords
                ? "Loading records..."
                : `${tableData.rows.length} Record(s) found ${
                    searchQuery ? "(filtered)" : ""
                  }`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 sm:mt-0">
            {allUserCattle.length > 1 && (
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <DropdownSmall
                  label="Filter by Herd"
                  items={allUserCattle.map((c) => c.cattle_name)}
                  selected={currentCattleData?.cattle_name || ""}
                  onSelect={(name) => {
                    const cattle = allUserCattle.find(
                      (c) => c.cattle_name === name
                    );
                    if (cattle)
                      setSelectedCattleId(cattle.cattle_id.toString());
                  }}
                  placeholder="Select Herd"
                />
              </div>
            )}
            <Button
              text="Herd Details"
              style="secondary"
              arrow="left"
              onClick={() =>
                router.push(
                  `/platform/${parsedUserId}/cattle_rearing/${selectedCattleId}`
                )
              }
              isDisabled={
                !selectedCattleId || loadingUserCattle || loadingMilkRecords
              }
            />
            <Button
              text="Log Milk"
              style="primary"
              onClick={handleAddRecord}
              isDisabled={
                !selectedCattleId ||
                allUserCattle.length === 0 ||
                loadingUserCattle ||
                loadingMilkRecords
              }
            />
          </div>
        </div>

        {loadingUserCattle && (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        )}

        {!loadingUserCattle &&
          allUserCattle.length > 0 &&
          !selectedCattleId && (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-600 dark:text-gray-400">
                Please select a cattle herd to view milk production logs.
              </p>
            </div>
          )}

        {!loadingUserCattle && selectedCattleId && (
          <Table
            data={{ columns: tableData.columns, rows: tableData.rows }}
            filteredRows={tableData.rows}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            paginationItems={paginationItems}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecordCount={tableData.rows.length}
            view="cattle_milk"
            loading={loadingMilkRecords}
            reset={true}
            download={true}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      {showMilkModal && parsedUserId && currentCattleData && (
        <CattleMilkModal
          isOpen={showMilkModal}
          onClose={() => {
            setShowMilkModal(false);
            setEditingRecord(null);
          }}
          formTitle={
            editingRecord
              ? `Edit Milk Record (${currentCattleData.cattle_name})`
              : `Log Milk (${currentCattleData.cattle_name})`
          }
          userId={parseInt(parsedUserId)}
          initialCattleId={currentCattleData.cattle_id}
          allUserCattle={allUserCattle}
          milkRecordToEdit={editingRecord}
          onRecordSaved={() => {
            fetchMilkRecordsAndRelatedData();
            setShowMilkModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default CattleMilkPage;
