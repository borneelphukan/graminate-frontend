import React, { useState, useMemo, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import SearchBar from "@/components/ui/SearchBar";
import Button from "@/components/ui/Button";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Loader from "@/components/ui/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "@/lib/utils/axiosInstance";
import Checkbox from "../ui/Checkbox";

type RowType = unknown[];

type TableData = {
  columns: string[];
  rows: RowType[];
};

type Props = {
  onRowClick?: (row: RowType) => void;
  data: TableData;
  filteredRows: RowType[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  paginationItems: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalRecordCount: number;
  view?: string;
  exportEnabled?: boolean;
  loading?: boolean;
  reset?: boolean;
  hideChecks?: boolean;
  download?: boolean;
};

const Table = ({
  onRowClick,
  data,
  filteredRows,
  currentPage,
  setCurrentPage,
  itemsPerPage: initialItemsPerPage, // Rename prop to avoid conflict
  setItemsPerPage,
  paginationItems,
  searchQuery,
  setSearchQuery,
  totalRecordCount,
  view = "",
  loading,
  reset = true,
  hideChecks = false,
  download = true,
}: Props) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState<boolean[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [itemsPerPage, setItemsPerPageState] = useState(10); // Use internal state, default to 10

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setSelectedRows(new Array(paginatedRows.length).fill(false));
    setSelectAll(false);
  }, [paginatedRows]);

  const selectedRowCount = selectedRows.filter(Boolean).length;

  const sortedAndPaginatedRows = useMemo(() => {
    const rows = [...paginatedRows];
    if (sortColumn !== null) {
      rows.sort((a, b) => {
        const valueA = a[sortColumn];
        const valueB = b[sortColumn];

        if (typeof valueA === "string" && typeof valueB === "string") {
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        if (typeof valueA === "number" && typeof valueB === "number") {
          return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }
    return rows;
  }, [paginatedRows, sortColumn, sortOrder]);

  const getExportRows = () => {
    const selected = selectedRows
      .map((isSelected, idx) =>
        isSelected ? sortedAndPaginatedRows[idx] : null
      )
      .filter((row): row is RowType => row !== null);

    return selected.length > 0 ? selected : sortedAndPaginatedRows;
  };

  const exportTableData = (format: "pdf" | "xlsx") => {
    const exportRows = getExportRows();

    if (exportRows.length === 0) {
      Swal.fire("No Data", "There is no data to export.", "info");
      return;
    }

    if (format === "pdf") {
      const doc = new jsPDF();
      const pdfBodyData = exportRows.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return "";
          return String(cell);
        })
      );
      autoTable(doc, {
        head: [data.columns],
        body: pdfBodyData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94] },
      });
      doc.save(`${view}.pdf`);
    }

    if (format === "xlsx") {
      const worksheet = XLSX.utils.aoa_to_sheet([data.columns, ...exportRows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${view}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;
    setSelectAll(checked);
    setSelectedRows(new Array(paginatedRows.length).fill(checked));
  };

  const handleRowCheckboxChange = (
    rowIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    const checked = e.target.checked;
    setSelectedRows((prev) => {
      const newSelected = [...prev];
      newSelected[rowIndex] = checked;
      setSelectAll(newSelected.every(Boolean));
      return newSelected;
    });
  };

  const deleteSelectedRows = async () => {
    const rowsToDelete: number[] = [];

    paginatedRows.forEach((row, index) => {
      if (selectedRows[index]) {
        const id = row[0];
        if (typeof id === "number") rowsToDelete.push(id);
      }
    });

    if (rowsToDelete.length === 0) {
      await Swal.fire(
        "No Selection",
        "Please select at least one row to delete.",
        "info"
      );
      return;
    }

    const entityNames: Record<string, string> = {
      companies: "company",
      contacts: "contact",
      labours: "labour",
      inventory: "inventory",
      warehouse: "warehouse",
      contracts: "contract",
      receipts: "receipt",
      tasks: "tasks",
      flock: "flock",
      poultry_health: "poultry-health",
      poultry_eggs: "poultry-eggs",
      poultry_feeds: "poultry-feeds",
      cattle: "cattle records",
      cattle_milk: "cattle-milk",
      apiculture: "apiculture",
      hives: "hives",
      inspections: "hive-inspections",
    };

    const entityToDelete = entityNames[view] || view;
    const pluralEntity =
      rowsToDelete.length > 1 ? `${entityToDelete}s` : entityToDelete;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete the selected ${pluralEntity}?`,
      icon: "warning",
      confirmButtonColor: "#04ad79",
      cancelButtonColor: "#bbbbbc",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const endpointMap: Record<string, string> = {
          contacts: "contacts",
          companies: "companies",
          contracts: "contracts",
          receipts: "receipts",
          tasks: "tasks",
          labour: "labour",
          inventory: "inventory",
          warehouse: "warehouse",
          flock: "flock",
          poultry_health: "poultry-health",
          poultry_eggs: "poultry-eggs",
          poultry_feeds: "poultry-feeds",
          cattle: "cattle-rearing",
          cattle_milk: "cattle-milk",
          apiculture: "apiculture",
          hives: "bee-hives",
          inspections: "hive-inspections",
        };

        const endpoint = endpointMap[view] || "inventory";

        await Promise.all(
          rowsToDelete.map(async (id) => {
            try {
              await axiosInstance.delete(`/${endpoint}/delete/${id}`);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : `Failed to delete ${endpoint.slice(0, -1)} with id ${id}`;
              console.error(message);
              throw new Error(message);
            }
          })
        );

        location.reload();
      } catch (error) {
        console.error("Error deleting rows:", error);
        await Swal.fire(
          "Error",
          "Failed to delete selected rows. Please try again.",
          "error"
        );
      }
    }
  };

  const toggleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnIndex);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleSelect = (item: string) => {
    const itemsPerPageMap: Record<string, number> = {
      "10 per page": 10,
      "25 per page": 25,
      "50 per page": 50,
      "100 per page": 100,
    };
    const newItemsPerPage = itemsPerPageMap[item] || 10;
    setItemsPerPageState(newItemsPerPage);
    setItemsPerPage(newItemsPerPage); // Notify parent component if it's listening
  };

  return (
    <div>
      <div className="flex py-4 justify-between items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 rounded-t-lg transition-colors duration-300">
        <div className="flex gap-2">
          <SearchBar
            mode="table"
            placeholder="Search table"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
          />
          {selectedRowCount > 0 && (
            <div className="flex items-center ml-4">
              <span className="text-gray-200 dark:text-gray-400 text-sm font-medium">
                {selectedRowCount} selected
              </span>
              <button
                className="ml-2 text-blue-200 text-sm hover:underline cursor-pointer"
                onClick={(event) => {
                  event.preventDefault();
                  deleteSelectedRows();
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-row gap-2">
          {reset && view !== "receipts" && (
            <Button
              style="secondary"
              text="Reset"
              isDisabled={filteredRows.length === 0}
              onClick={async () => {
                if (filteredRows.length === 0) return;

                const entityNames: Record<string, string> = {
                  contacts: "contacts",
                  companies: "companies",
                  contracts: "contracts",
                  tasks: "tasks",
                  labour: "labour",
                  inventory: "inventory",
                  warehouse: "warehouse",
                  flock: "flock",
                  poultry_health: "poultry-health",
                  poultry_eggs: "poultry-eggs",
                  poultry_feeds: "poultry-feeds",
                  cattle: "cattle-rearing",
                  cattle_milk: "cattle-milk",
                  apiculture: "apiculture",
                  hives: "bee-hives",
                  inspections: "hive-inspections",
                };

                const entityToTruncate = entityNames[view] || view;

                const result = await Swal.fire({
                  title: "Are you sure?",
                  text: `This will reset your ${entityToTruncate} records.`,
                  icon: "warning",
                  confirmButtonColor: "#04ad79",
                  cancelButtonColor: "#bbbbbc",
                  showCancelButton: true,
                  confirmButtonText: "Reset",
                  cancelButtonText: "Cancel",
                });

                if (result.isConfirmed) {
                  try {
                    const userId = localStorage.getItem("userId");
                    await axiosInstance.post(`/${entityToTruncate}/reset`, {
                      userId,
                    });
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                    Swal.fire("Error", "Failed to reset table.", "error");
                  }
                }
              }}
            />
          )}

          {download && (
            <div className="relative" ref={dropdownRef}>
              <Button
                style="secondary"
                text="Download Data"
                isDisabled={filteredRows.length === 0}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
              />
              {showExportDropdown && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-lg z-50 transition transform duration-200">
                  <button
                    className="w-full text-left text-sm px-4 py-2 hover:bg-gray-500 dark:hover:bg-gray-600 rounded-t-lg"
                    onClick={() => {
                      exportTableData("pdf");
                      setShowExportDropdown(false);
                    }}
                  >
                    Export as PDF
                  </button>
                  <button
                    className="w-full text-left text-sm px-4 py-2 hover:bg-gray-500 dark:hover:bg-gray-600 rounded-b-lg"
                    onClick={() => {
                      exportTableData("xlsx");
                      setShowExportDropdown(false);
                    }}
                  >
                    Export as XLSX
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader />
        </div>
      ) : sortedAndPaginatedRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {!hideChecks && (
                  <th
                    className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      id="select-all-checkbox"
                      checked={selectAll && paginatedRows.length > 0}
                      onChange={handleSelectAllChange}
                      disabled={paginatedRows.length === 0}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      aria-label={selectAll ? "Deselect all" : "Select all"}
                    />
                  </th>
                )}
                {data.columns.map((column, index) => (
                  <th
                    key={index}
                    className="p-3 text-left text-xs font-medium text-dark dark:text-light uppercase tracking-wider cursor-pointer transition-colors duration-200 hover:bg-gray-500 dark:hover:bg-gray-700"
                    onClick={() => toggleSort(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="mr-2">{column}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                        />
                      </svg>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedAndPaginatedRows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}-${row[0]}`}
                  className={`cursor-pointer transition-colors duration-200 ${
                    selectedRows[rowIndex]
                      ? "bg-primary-50 dark:bg-primary-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).tagName !== "INPUT" &&
                      (e.target as HTMLElement).closest("button") === null
                    ) {
                      onRowClick?.(row);
                    }
                  }}
                >
                  {!hideChecks && (
                    <td
                      className="p-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        id={`row-checkbox-${rowIndex}`}
                        checked={selectedRows[rowIndex] || false}
                        onChange={(e) => handleRowCheckboxChange(rowIndex, e)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </td>
                  )}

                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="p-3 whitespace-nowrap text-sm text-dark dark:text-light max-w-[200px] truncate"
                      title={
                        Array.isArray(cell)
                          ? cell.join(", ")
                          : typeof cell === "string" || typeof cell === "number"
                          ? String(cell)
                          : undefined
                      }
                    >
                      {view === "inventory" &&
                      data.columns[cellIndex] === "Status" ? (
                        <div className="flex gap-[2px] text-sm">
                          {(() => {
                            const quantityIndex =
                              data.columns.indexOf("Quantity");
                            if (quantityIndex === -1) return "?";
                            const quantityValue = row[quantityIndex];
                            if (typeof quantityValue !== "number")
                              return (
                                <FontAwesomeIcon
                                  icon={faCircle}
                                  className="text-red-200"
                                />
                              );
                            const quantity = quantityValue;
                            const max = Math.max(
                              0,
                              ...filteredRows
                                .map((r) => r[quantityIndex])
                                .filter(
                                  (q): q is number => typeof q === "number"
                                )
                            );
                            const ratio = max > 0 ? quantity / max : 0;
                            let count = 0;
                            let color = "";
                            if (quantity <= 0 || (max > 0 && ratio < 0.25)) {
                              count = 1;
                              color = "text-red-200";
                            } else if (max > 0 && ratio < 0.5) {
                              count = 2;
                              color = "text-orange-400";
                            } else if (max > 0 && ratio < 0.75) {
                              count = 3;
                              color = "text-yellow-200";
                            } else {
                              count = 4;
                              color = "text-green-200";
                            }
                            return Array.from({ length: count }).map((_, i) => (
                              <FontAwesomeIcon
                                key={i}
                                icon={faCircle}
                                className={color}
                              />
                            ));
                          })()}
                        </div>
                      ) : typeof cell === "string" ||
                        typeof cell === "number" ||
                        typeof cell === "boolean" ||
                        cell === null ||
                        cell === undefined ? (
                        String(cell)
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-8 text-gray-300">
          <span className="text-2xl block mb-2">⚠️</span> No Data Available
        </div>
      )}

      {!loading && totalRecordCount > 0 && (
        <nav
          className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gray-50 dark:bg-gray-800 rounded-b-lg transition-colors duration-300"
          aria-label="Pagination"
        >
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing{" "}
                <span className="font-medium">
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    totalRecordCount
                  )}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalRecordCount)}
                </span>{" "}
                of <span className="font-medium">{totalRecordCount}</span>{" "}
                results
              </p>
            </div>
            <div className="flex items-center">
              <Button
                text="Previous"
                style="ghost"
                arrow="left"
                isDisabled={currentPage === 1}
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
              />
              <p className="mx-3 text-sm dark:text-light text-dark">
                <span className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-sm">
                  {currentPage}
                </span>
              </p>
              <Button
                text="Next"
                style="ghost"
                arrow="right"
                isDisabled={
                  currentPage === Math.ceil(totalRecordCount / itemsPerPage) ||
                  totalRecordCount === 0
                }
                onClick={() => {
                  if (currentPage < Math.ceil(totalRecordCount / itemsPerPage))
                    setCurrentPage(currentPage + 1);
                }}
              />
            </div>
            <div className="relative">
              <DropdownLarge
                items={paginationItems}
                selectedItem={`${itemsPerPage} per page`}
                onSelect={handleSelect}
              />
            </div>
          </div>
          <div className="flex sm:hidden flex-1 justify-between items-center">
            <Button
              text="Prev"
              style="ghost"
              isDisabled={currentPage === 1}
              onClick={() => {
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
            />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Page <span className="font-medium">{currentPage}</span>
            </p>
            <Button
              text="Next"
              style="ghost"
              isDisabled={
                currentPage === Math.ceil(totalRecordCount / itemsPerPage) ||
                totalRecordCount === 0
              }
              onClick={() => {
                if (currentPage < Math.ceil(totalRecordCount / itemsPerPage))
                  setCurrentPage(currentPage + 1);
              }}
            />
          </div>
        </nav>
      )}
    </div>
  );
};

export default Table;
