import { Column, Id, Task } from "@/types/types";
import React from "react";

type KanbanListViewProps = {
  tasks: Task[];
  columns: Column[];
  openTaskModal: (task: Task) => void;
};

const KanbanListView = ({
  tasks = [],
  columns = [],
  openTaskModal,
}: KanbanListViewProps) => {
  const getColumnName = (columnId: Id) => {
    return columns.find((col) => col.id === columnId)?.title || "Unknown";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-200 text-light dark:bg-red-200 dark:text-light";
      case "medium":
        return "bg-yellow-200 text-dark dark:bg-yellow-900 dark:text-dark";
      case "low":
        return "bg-green-200 text-light dark:bg-green-200 dark:text-light";
      default:
        return "bg-gray-400 text-dark dark:bg-gray-400 dark:text-dark";
    }
  };

  const handleRowClick = (task: Task) => {
    openTaskModal(task);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center text-dark dark:text-light py-8">
        No tasks found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="py-3 px-6">
              ID
            </th>
            <th scope="col" className="py-3 px-6">
              Summary
            </th>
            <th scope="col" className="py-3 px-6">
              Status
            </th>
            <th scope="col" className="py-3 px-6">
              Priority
            </th>
            <th scope="col" className="py-3 px-6">
              Deadline
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => handleRowClick(task)}
            >
              <th
                scope="row"
                className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
              >
                {task.id}
              </th>
              <td className="py-4 px-6 text-dark dark:text-light">
                {task.title}
              </td>
              <td className="py-4 px-6 text-dark dark:text-light">
                {getColumnName(task.columnId)}
              </td>
              <td className="py-4 px-6">
                {task.priority && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                )}
              </td>
              <td className="py-4 px-6 text-dark dark:text-light">
                {task.deadline}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KanbanListView;
