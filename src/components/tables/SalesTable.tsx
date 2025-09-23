import React, { useState, useMemo, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import SearchBar from "@/components/ui/SearchBar";
import Button from "@/components/ui/Button";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Loader from "@/components/ui/Loader";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "@/lib/utils/axiosInstance";
import Checkbox from "../ui/Checkbox";
import { useRouter } from "next/router";

export type TableCellValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | null
  | undefined;
export type RowType = TableCellValue[];

export type TableData = {
  columns: string[];
  rows: RowType[];
};

type ApiItem = {
  item_id?: number;
  description: string;
  quantity: number;
  rate: number;
};

type ReceiptForNavigation = {
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
  sales_id?: number;
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
  onDataMutated?: () => void;
  currentUserId?: string | number | null;
  renderCell?: (
    cell: TableCellValue,
    columnName: string,
    row: RowType,
    rowIndex: number,
    cellIndex: number
  ) => React.ReactNode;
};

const SalesTable = ({
  onRowClick,
  data,
  filteredRows,
  currentPage,
  setCurrentPage,
  itemsPerPage,
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
  onDataMutated,
  currentUserId,
}: Props) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState<boolean[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setSelectedRows(new Array(paginatedRows.length).fill(false));
    setSelectAll(false);
  }, [paginatedRows]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

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
        isSelected && sortedAndPaginatedRows[idx]
          ? sortedAndPaginatedRows[idx]
          : null
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

    const headers = data.columns;

    if (format === "pdf") {
      const doc = new jsPDF();
      const pdfBodyData = exportRows.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return "";
          if (Array.isArray(cell)) return cell.join(", ");
          return String(cell);
        })
      );

      autoTable(doc, {
        head: [headers],
        body: pdfBodyData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94] },
      });
      doc.save(`${view || "table_export"}.pdf`);
    }

    if (format === "xlsx") {
      const excelData = exportRows.map((row) =>
        row.map((cell) => (Array.isArray(cell) ? cell.join(", ") : cell))
      );
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${view || "table_export"}.xlsx`;
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

    sortedAndPaginatedRows.forEach((row, index) => {
      if (selectedRows[index]) {
        const id = row[0];
        if (typeof id === "number") {
          rowsToDelete.push(id);
        } else {
          console.warn("Row ID is not a number for deletion:", row);
        }
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
      sales: "sales",
      expenses: "expenses",
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
          sales: "sales",
          expenses: "expenses",
        };
        const endpoint = endpointMap[view] || "sales";

        const deletePromises = rowsToDelete.map(async (id) => {
          await axiosInstance.delete(`/${endpoint}/delete/${id}`);
        });

        await Promise.all(deletePromises);

        setSelectedRows([]);
        setSelectAll(false);
        onDataMutated?.();
      } catch (error) {
        console.error("Error deleting rows:", error);
        await Swal.fire(
          "Error",
          `Failed to delete selected ${pluralEntity}. Please try again. Details: ${
            error instanceof Error ? error.message : String(error)
          }`,
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
      "10 per pge": 10,
      "25 per page": 25,
      "50 per page": 50,
      "100 per page": 100,
    };
    setItemsPerPage(itemsPerPageMap[item] || 25);
    setCurrentPage(1);
  };

  const handleAddInvoiceClick = (saleId: number) => {
    const userIdToUse = currentUserId || router.query.user_id;
    const finalUserId = Array.isArray(userIdToUse)
      ? userIdToUse[0]
      : userIdToUse;

    if (finalUserId) {
      router.push({
        pathname: `/platform/${finalUserId}/crm`,
        query: { view: "receipts", saleId: saleId },
      });
    } else {
      console.error("User ID not found for navigation.");
      Swal.fire(
        "Error",
        "Could not determine user. Please try again.",
        "error"
      );
    }
  };

  const handleViewReceiptClick = async (saleId: number) => {
    const userIdToUse = currentUserId || router.query.user_id;
    const finalUserId = Array.isArray(userIdToUse)
      ? userIdToUse[0]
      : userIdToUse;

    if (!finalUserId) {
      Swal.fire("Error", "User ID not found.", "error");
      return;
    }

    try {
      const response = await axiosInstance.get<{
        receipts: ReceiptForNavigation[];
      }>(`/receipts/${finalUserId}`);
      const receipts = response.data.receipts || [];
      const linkedReceipt = receipts.find(
        (receipt) => receipt.sales_id === saleId
      );

      if (linkedReceipt) {
        router.push({
          pathname: `/platform/${finalUserId}/receipts/${linkedReceipt.invoice_id}`,
          query: { data: JSON.stringify(linkedReceipt), user_id: finalUserId },
        });
      } else {
        Swal.fire("Error", "Could not find the linked receipt.", "error");
      }
    } catch (error) {
      console.error("Error fetching receipt for sale:", saleId, error);
      Swal.fire("Error", "Failed to fetch receipt details.", "error");
    }
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
          {selectedRowCount > 0 && !hideChecks && (
            <div className="flex items-center ml-4">
              <span className="text-gray-200 dark:text-gray-400 text-sm font-medium">
                {selectedRowCount} selected
              </span>
              <button
                className="ml-2 text-green-200 hover:text-green-100 text-sm hover:underline cursor-pointer"
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
          {reset && (
            <Button
              style="secondary"
              text="Reset"
              isDisabled={filteredRows.length === 0}
              onClick={async () => {
                if (filteredRows.length === 0) return;
                const entityNames: Record<string, string> = {
                  sales: "sales",
                  expenses: "expenses",
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
                isDisabled={sortedAndPaginatedRows.length === 0}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
              />
              {showExportDropdown && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-lg z-50 transition transform duration-200">
                  <button
                    className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-t-lg"
                    onClick={() => {
                      exportTableData("pdf");
                      setShowExportDropdown(false);
                    }}
                  >
                    Export as PDF
                  </button>
                  <button
                    className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-b-lg"
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
                    (e.target as HTMLElement).closest(
                      "input[type='checkbox']"
                    ) === null &&
                    (e.target as HTMLElement).closest("button") === null &&
                    onRowClick
                  ) {
                    onRowClick(row);
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

                {row.map((cell, cellIndex) => {
                  const isInvoiceColumn = data.columns[cellIndex] === "Invoice";
                  const saleId = row[0] as number;
                  const invoiceCreated = cell === true || cell === "Yes";

                  return (
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
                      {isInvoiceColumn && view === "sales" ? (
                        invoiceCreated ? (
                          <Button
                            text="View Receipt"
                            style="ghost"
                            onClick={() => {
                              handleViewReceiptClick(saleId);
                            }}
                          />
                        ) : (
                          <Button
                            text="Add Receipt"
                            style="secondary"
                            onClick={() => {
                              handleAddInvoiceClick(saleId);
                            }}
                          />
                        )
                      ) : Array.isArray(cell) ? (
                        cell.join(", ")
                      ) : typeof cell === "boolean" ? (
                        cell ? (
                          "Yes"
                        ) : (
                          "No"
                        )
                      ) : cell === null || cell === undefined ? (
                        "-"
                      ) : (
                        String(cell)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
export default SalesTable;
