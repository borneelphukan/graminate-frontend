import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import PlatformLayout from "@/layout/PlatformLayout";
import { PAGINATION_ITEMS } from "@/constants/options";
import Head from "next/head";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import FlockForm from "@/components/form/FlockForm";
import Table from "@/components/tables/Table";

type View = "flock";

interface FlockApiData {
  flock_id: number;
  user_id?: number;
  flock_name: string;
  flock_type: string;
  quantity: number;
  created_at?: string;
  breed?: string;
  source?: string;
  housing_type?: string;
  notes?: string;
}

const FlocksPage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const parsedUserId = Array.isArray(user_id) ? user_id[0] : user_id;
  const view: View = "flock";

  const [flockRecords, setFlockRecords] = useState<FlockApiData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingFlock, setEditingFlock] = useState<FlockApiData | null>(null);

  const fetchFlocks = useCallback(async () => {
    if (!parsedUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `/flock/user/${encodeURIComponent(parsedUserId)}`
      );
      setFlockRecords(response.data.flocks || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching flock data:", error.message);
      } else {
        console.error("Unknown error fetching flock data");
      }
      setFlockRecords([]);
    } finally {
      setLoading(false);
    }
  }, [parsedUserId]);

  useEffect(() => {
    if (router.isReady) {
      fetchFlocks();
    }
  }, [router.isReady, fetchFlocks]);

  const filteredFlockRecords = useMemo(() => {
    if (!searchQuery) {
      return flockRecords;
    }
    return flockRecords.filter((item) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        item.flock_name.toLowerCase().includes(searchTerm) ||
        item.flock_type.toLowerCase().includes(searchTerm) ||
        String(item.quantity).toLowerCase().includes(searchTerm) ||
        (item.breed && item.breed.toLowerCase().includes(searchTerm)) ||
        (item.source && item.source.toLowerCase().includes(searchTerm)) ||
        (item.housing_type &&
          item.housing_type.toLowerCase().includes(searchTerm))
      );
    });
  }, [flockRecords, searchQuery]);

  const handleFlockFormSuccess = () => {
    setIsSidebarOpen(false);
    setEditingFlock(null);
    fetchFlocks();
  };

  const handleEditFlock = (rowData: unknown[]) => {
    const flockId = rowData[0] as number;
    const flockToEdit = flockRecords.find((f) => f.flock_id === flockId);
    if (flockToEdit) {
      setEditingFlock(flockToEdit);
      setIsSidebarOpen(true);
    }
  };

  const tableData = useMemo(() => {
    return {
      columns: ["#", "Flock Name", "Type", "Qty", "Breed", "Source", "Housing"],
      rows: filteredFlockRecords.map((item) => [
        item.flock_id,
        item.flock_name,
        item.flock_type,
        item.quantity,
        item.breed || "N/A",
        item.source || "N/A",
        item.housing_type || "N/A",
      ]),
    };
  }, [filteredFlockRecords]);

  if (!parsedUserId && !loading) {
    return (
      <PlatformLayout>
        <Head>
          <title>Graminate | Flocks</title>
        </Head>
        <div className="container mx-auto p-4 text-center">
          <p className="text-red-500">User ID not found. Cannot load flocks.</p>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | Flocks</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center dark:bg-dark relative mb-4">
          <div>
            <h1 className="text-lg font-semibold dark:text-white">
              Poultry Farm Flocks
            </h1>
            <p className="text-xs text-dark dark:text-light">
              {loading
                ? "Loading records..."
                : `${filteredFlockRecords.length} Record(s) found ${
                    searchQuery ? "(filtered)" : ""
                  }`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              text="Add Flock"
              style="primary"
              add
              onClick={() => {
                setEditingFlock(null);
                setIsSidebarOpen(true);
              }}
            />
          </div>
        </div>

        {loading && !flockRecords.length ? (
          <div className="flex justify-center items-center py-10">
            <Loader />
          </div>
        ) : (
          <Table
            data={tableData}
            filteredRows={tableData.rows}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            paginationItems={PAGINATION_ITEMS}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecordCount={filteredFlockRecords.length}
            onRowClick={(row) => {
              const flockId = row[0] as number;
              const flockName = row[1] as string;
              if (parsedUserId && flockId) {
                router.push({
                  pathname: `/platform/${parsedUserId}/poultry/${flockId}`,
                  query: {
                    flockName: encodeURIComponent(flockName),
                  },
                });
              }
            }}
            view={view}
            loading={loading && flockRecords.length > 0}
            reset={true}
            hideChecks={false}
            download={true}
          />
        )}

        {isSidebarOpen && (
          <FlockForm
            onClose={() => {
              setIsSidebarOpen(false);
              setEditingFlock(null);
            }}
            formTitle={editingFlock ? "Edit Flock" : "Add New Flock"}
            onFlockUpdateOrAdd={handleFlockFormSuccess}
          />
        )}
      </div>
    </PlatformLayout>
  );
};

export default FlocksPage;
