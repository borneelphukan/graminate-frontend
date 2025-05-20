import { useAllRowsSelected } from "@/hooks/tables";
import React, { useState, JSX } from "react";
import Checkbox from "../ui/Checkbox";

type FilterTasksFn = (column: {
  id: string;
  title: string;
  tasks: Task[];
}) => Task[];

type Task = {
  id: string;
  title: string;
  type: string;
};

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

type Header = {
  label: string;
  key?: string;
};

type Props = {
  columns: Column[];
  filterTasks: FilterTasksFn;
  searchQuery: string;
  headers: Header[];
};

const ViewTable = ({ columns, filterTasks, searchQuery, headers }: Props) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  useAllRowsSelected(columns, filterTasks, selectedRows, setIsAllSelected);

  const highlightText = (text: string, query: string): JSX.Element | string => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: text.replace(regex, '<mark class="bg-yellow-200">$1</mark>'),
        }}
      />
    );
  };

  const toggleRowSelection = (taskId: string, isSelected: boolean) => {
    setSelectedRows((prevSelected) => {
      const updatedRows = new Set(prevSelected);
      if (isSelected) {
        updatedRows.add(taskId);
      } else {
        updatedRows.delete(taskId);
      }
      return updatedRows;
    });
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsAllSelected(checked);

    if (checked) {
      const allTaskIds = columns.flatMap((column) =>
        filterTasks(column).map((task) => task.id)
      );
      setSelectedRows(new Set(allTaskIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const hasData = columns.some((column) => filterTasks(column).length > 0);

  return (
    <table className="table-auto w-full bg-gray-50 dark:bg-slate-800 rounded-lg">
      <thead>
        <tr>
          <th className="p-2 border border-gray-300 dark:border-gray-200 bg-gray-400 dark:bg-gray-800 text-left">
            <Checkbox
              id="select-all-checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4"
              aria-label={isAllSelected ? "Deselect all" : "Select all"}
            />
          </th>
          {headers.map((header) => (
            <th
              key={header.label}
              className="p-2 border border-gray-300 dark:border-gray-200 bg-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-pointer text-left"
            >
              {header.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hasData ? (
          columns.map((column) =>
            filterTasks(
              column as { id: string; title: string; tasks: Task[] }
            ).map((task) => (
              <tr
                key={task.id}
                className="cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-700"
              >
                <td className="p-2 border border-gray-300 dark:border-gray-200">
                  <Checkbox
                    id={`task-checkbox-${task.id}`}
                    checked={selectedRows.has(task.id)}
                    onChange={(e) =>
                      toggleRowSelection(task.id, e.target.checked)
                    }
                    className="h-4 w-4"
                    aria-label={`Select task ${task.id}`}
                  />
                </td>
                <td className="p-2 border border-gray-300 dark:border-gray-200 text-base font-light dark:text-gray-400">
                  {task.id}
                </td>
                <td className="p-2 border border-gray-300 dark:border-gray-200 text-base font-light dark:text-gray-400">
                  {highlightText(task.title, searchQuery)}
                </td>
                <td className="p-2 border border-gray-300 dark:border-gray-200 text-base font-light dark:text-gray-400">
                  {column.title}
                </td>
                <td className="p-2 border border-gray-300 dark:border-gray-200 text-base font-light dark:text-gray-400">
                  {task.type
                    ? task.type.split(", ").map((label) => (
                        <span
                          key={label}
                          className={`inline-block text-xs font-semibold text-white rounded px-2 py-1 ${
                            {
                              Finance: "bg-green-100",
                              Research: "bg-blue-200",
                              Maintenance: "bg-yellow-200",
                              Urgent: "bg-red-200",
                            }[label] || "bg-gray-300"
                          }`}
                        >
                          {label}
                        </span>
                      ))
                    : null}
                </td>
              </tr>
            ))
          )
        ) : (
          <tr>
            <td
              colSpan={headers.length + 1}
              className="text-center p-2 text-gray-300 border border-gray-300 dark:border-gray-200"
            >
              <span className="text-lg">⚠️</span> No Tasks Available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default ViewTable;
