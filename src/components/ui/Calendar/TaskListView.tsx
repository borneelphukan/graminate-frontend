import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlus,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { DisplayTask } from "./Calendar";
import Button from "../Button";
import Loader from "../Loader";

type TaskListViewProps = {
  selectedDate: Date;
  tasks: DisplayTask[];
  removeTask: (taskId: number) => void;
  updateTaskStatus: (taskId: number, newStatus: string) => void;
  setShowTasks: (value: boolean) => void;
  isSelectedDatePast: boolean;
  setShowAddTask: (value: boolean) => void;
  getDayStatus: (date: Date) => string;
  isLoading: boolean;
};

const getPriorityClass = (priority: "Low" | "Medium" | "High") => {
  switch (priority) {
    case "High":
      return "text-light";
    case "Medium":
      return "text-dark";
    case "Low":
      return "text-light";
    default:
      return "text-dark dark:text-light";
  }
};

const TaskListView = ({
  selectedDate,
  tasks,
  removeTask,
  updateTaskStatus,
  setShowTasks,
  isSelectedDatePast,
  setShowAddTask,
  getDayStatus,
  isLoading,
}: TaskListViewProps) => {
  const handleAddTaskClick = () => {
    setShowAddTask(true);
  };

  const handleBackClick = () => {
    setShowTasks(false);
  };

  const handleCheckboxChange = (task: DisplayTask) => {
    if (isSelectedDatePast) return;
    const newStatus = task.status === "Completed" ? "To Do" : "Completed";
    updateTaskStatus(task.task_id, newStatus);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 border-b border-gray-400 dark:border-gray-600 pb-2">
        <button
          onClick={handleBackClick}
          className="p-2 rounded-full text-dark hover:text-dark dark:text-light hover:bg-gray-400 dark:hover:bg-gray-700 dark:hover:text-light transition-colors duration-150 ease-in-out"
          aria-label="Back to calendar"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" />
        </button>
        <h3 className="text-md font-semibold text-gray-800 dark:text-white text-center">
          {getDayStatus(selectedDate)}
        </h3>

        {!isSelectedDatePast ? (
          <button
            aria-label="add tasks"
            className="p-2 rounded-full text-dark hover:text-light dark:text-light hover:bg-green-200 dark:hover:text-light transition-colors duration-150 ease-in-out"
            onClick={handleAddTaskClick}
          >
            <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9 h-9"></div>
        )}
      </div>
      <div className="my-6 space-y-1 max-h-60 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="mr-2" />
            <Loader />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-sm text-gray-300 py-4">
            No tasks scheduled for this day.
          </p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li
                key={task.task_id}
                className="py-3 flex justify-between items-center"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <input
                    type="checkbox"
                    className={`form-checkbox h-5 w-5 rounded text-green-200 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-green-200 focus:ring-green-100 dark:focus:ring-green-100 mr-3 ${
                      isSelectedDatePast
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer"
                    }`}
                    checked={task.status === "Completed"}
                    onChange={() => handleCheckboxChange(task)}
                    disabled={isSelectedDatePast}
                    aria-label={`Mark task ${task.name} as ${
                      task.status === "Completed" ? "to do" : "completed"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                        task.status === "Completed"
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : ""
                      }`}
                    >
                      {task.name}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0 w-16 text-right">
                  {task.status === "Completed" ? (
                    <Button
                      text="Delete"
                      style="delete"
                      type="button"
                      isDisabled={isSelectedDatePast}
                      onClick={() => removeTask(task.task_id)}
                    />
                  ) : (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getPriorityClass(
                        task.priority
                      )} ${
                        task.priority === "High"
                          ? "bg-red-200"
                          : task.priority === "Medium"
                          ? "bg-yellow-200"
                          : "bg-green-200"
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default TaskListView;
