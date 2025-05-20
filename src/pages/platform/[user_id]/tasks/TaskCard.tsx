import { Id, Task } from "@/types/types";
import React from "react";

type TaskCardProps = {
  task: Task;
  openTaskModal: (task: Task) => void;
  toggleDropdown: (colId: Id, taskId: Id) => void;
  deleteTask: (taskId: Id) => void;
  openLabelPopup: (taskId: Id) => void;
  dropdownOpen: { colId: Id; taskId: Id } | null;
  isOverlay?: boolean;
};

const TaskCard = ({
  task,
  openTaskModal,
  isOverlay = false,
}: TaskCardProps) => {
  if (!task) {
    return null;
  }

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

  return (
    <div
      className={`bg-white dark:bg-gray-700 p-3 rounded-md shadow relative ${
        isOverlay ? "cursor-grabbing" : "cursor-pointer"
      } touch-manipulation`}
      onClick={(e) => {
        if (isOverlay) return;
        const target = e.target as HTMLElement;
        if (!target.closest('[aria-label="ellipsis"]')) {
          openTaskModal(task);
        }
      }}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium dark:text-light mr-2 break-words">
          {task.title}
        </p>
      </div>
      {task.type && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.type.split(",").map((label) =>
            label.trim() ? (
              <span
                key={label.trim()}
                className="text-xs bg-gray-300 text-light px-2.5 py-1 rounded-full dark:bg-gray-900 dark:text-light"
              >
                {label.trim()}
              </span>
            ) : null
          )}
        </div>
      )}
      <div className="flex justify-between items-center mt-2">
        {task.priority && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        )}
        <span className="text-xs text-dark dark:text-light">
          Task-
          {typeof task.id === "string" && task.id.startsWith("task-")
            ? task.id.toUpperCase()
            : task.id}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
