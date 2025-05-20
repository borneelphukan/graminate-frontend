import React, { useState, useEffect, KeyboardEvent } from "react";
import CustomTextArea from "@/components/ui/CustomTextArea";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis, faXmark } from "@fortawesome/free-solid-svg-icons";
import TextField from "../ui/TextField";
import DropdownLarge from "../ui/Dropdown/DropdownLarge";
import Swal from "sweetalert2";
import Button from "../ui/Button";

type TaskModalProps = {
  isOpen: boolean;
  taskDetails: {
    id: string;
    columnId: string;
    title: string;
    status: string;
    priority?: string;
    description?: string;
    deadline?: string;
  };
  projectName: string;
  availableLabels: string[];
  onClose: () => void;
  updateTask: (updatedTask: {
    id: string;
    title: string;
    columnId: string;
    status: string;
    priority?: string;
    description?: string;
    deadline?: string;
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};

const TaskModal = ({
  isOpen,
  taskDetails,
  projectName,
  onClose,
  deleteTask,
  updateTask,
}: TaskModalProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskDetails.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(
    taskDetails.description ?? ""
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const priorityOptions = ["Low", "Medium", "High"];
  const statusOptions = ["To Do", "In Progress", "Checks", "Completed"];
  const [taskData, setTaskData] = useState({
    ...taskDetails,
    priority: taskDetails.priority || "Medium",
    description: taskDetails.description ?? "",
    deadline: taskDetails.deadline ?? "",
  });

  const updateTaskField = async (
    field: keyof typeof taskData,
    value: string
  ) => {
    const originalValue = taskData[field];
    const updatedTaskData = { ...taskData, [field]: value };
    setTaskData(updatedTaskData);

    try {
      await updateTask(updatedTaskData);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      setTaskData((prev) => ({
        ...prev,
        [field]: originalValue,
      }));
      Swal.fire({
        title: "Update Failed",
        text: `Could not update ${field}`,
        icon: "error",
      });
    }
  };

  const handleDeadlineChange = async (newDeadline: string) => {
    const updatedTask = {
      ...taskData,
      deadline: newDeadline,
    };

    setTaskData(updatedTask);

    try {
      await updateTask(updatedTask);
    } catch (error) {
      console.error("Failed to update deadline:", error);
      setTaskData((prev) => ({
        ...prev,
        deadline: taskDetails.deadline ?? "",
      }));
      Swal.fire({
        title: "Update Failed",
        text: `Could not update deadline`,
        icon: "error",
      });
    }
  };

  const handleDelete = async () => {
    setShowDropdown(false);
    try {
      await deleteTask(taskDetails.id);
      onClose();
    } catch (error) {
      console.error("Error deleting task:", error);
      Swal.fire("Error!", "Could not delete the task.", "error");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const updatedTask = {
      ...taskData,
      status: newStatus,
      columnId: mapStatusToColumnId(newStatus),
    };
    setTaskData(updatedTask);

    try {
      await updateTask(updatedTask);
    } catch (error) {
      console.error("Failed to update status:", error);
      setTaskData(taskData);
      Swal.fire({
        title: "Update Failed",
        text: `Could not update status`,
        icon: "error",
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    const updatedTask = {
      ...taskData,
      priority: newPriority,
    };

    setTaskData(updatedTask);

    try {
      await updateTask(updatedTask);
    } catch (error) {
      console.error("Failed to update priority:", error);
      setTaskData(taskData);
      Swal.fire({
        title: "Update Failed",
        text: `Could not update priority`,
        icon: "error",
      });
    }
  };

  const mapStatusToColumnId = (status: string): string => {
    switch (status) {
      case "To Do":
        return "todo";
      case "In Progress":
        return "progress";
      case "Checks":
        return "check";
      case "Completed":
        return "done";
      default:
        return "todo";
    }
  };

  useEffect(() => {
    const currentDescription = taskDetails.description ?? "";
    setEditedTitle(taskDetails.title);
    setEditedDescription(currentDescription);
    setTaskData({
      ...taskDetails,
      priority: taskDetails.priority || "Medium",
      description: currentDescription,
      deadline: taskDetails.deadline ?? "",
    });
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setShowDropdown(false);
  }, [taskDetails]);

  const closeModal = () => {
    if (onClose) onClose();
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== taskData.title) {
      updateTaskField("title", editedTitle.trim());
    } else if (!editedTitle.trim()) {
      setEditedTitle(taskData.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveTitle();
    } else if (e.key === "Escape") {
      setEditedTitle(taskData.title);
      setIsEditingTitle(false);
    }
  };

  const startEditingDescription = () => {
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    if (editedDescription !== taskData.description) {
      updateTaskField("description", editedDescription);
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditedDescription(taskData.description);
    setIsEditingDescription(false);
  };

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 max-h-[90vh] w-full h-[80%] max-w-5xl shadow-xl relative flex flex-col overflow-hidden ">
        <div className="flex justify-between items-start mb-4 border-b border-gray-300">
          <p className="text-dark dark:text-light text-sm uppercase tracking-wide">
            {projectName} / TASK-{taskDetails.id}
          </p>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                className="p-2 rounded-md text-dark dark:text-light hover:bg-gray-500 dark:hover:bg-gray-700"
                aria-label="Options"
                onClick={toggleDropdown}
              >
                <FontAwesomeIcon icon={faEllipsis} className="h-5 w-5" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-md py-1 z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-dark dark:text-light hover:bg-gray-500 dark:hover:bg-gray-600"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <button
              className="p-2 rounded-md text-dark dark:text-light hover:bg-gray-500 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              aria-label="Close"
              onClick={closeModal}
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pr-2 -mr-2">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            <div>
              {isEditingTitle ? (
                <TextField
                  value={editedTitle}
                  onChange={setEditedTitle}
                  onBlur={saveTitle}
                  onKeyDown={handleTitleKeyDown}
                />
              ) : (
                <button
                  className="w-full text-left text-dark dark:text-light text-xl font-semibold hover:bg-gray-500 dark:hover:bg-gray-700 rounded px-2 py-1"
                  onClick={startEditingTitle}
                  aria-label="Edit task title"
                >
                  {taskData.title}
                </button>
              )}
            </div>

            <div className="mt-4">
              <label
                htmlFor="task-description"
                className="block text-dark dark:text-light font-medium text-base mb-2"
              >
                Description
              </label>
              {isEditingDescription ? (
                <>
                  <CustomTextArea
                    placeholder="Add a more detailed description..."
                    value={editedDescription}
                    onInput={setEditedDescription}
                  />
                  <div className="flex space-x-2 mt-2">
                    <Button
                      text="Save"
                      onClick={handleSaveDescription}
                      style="primary"
                    />

                    <Button
                      text="Cancel"
                      onClick={handleCancelDescription}
                      style="secondary"
                    />
                  </div>
                </>
              ) : (
                <div
                  className="w-full min-h-[80px] p-3 text-sm rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-text whitespace-pre-wrap dark:text-light"
                  onClick={startEditingDescription}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      startEditingDescription();
                  }} // Accessibility
                  aria-label="Edit description"
                >
                  {taskData.description ? (
                    taskData.description
                  ) : (
                    <span className="text-gray-300">
                      Add a more detailed description...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="border border-gray-300 dark:border-gray-600 md:col-span-1 space-y-6 rounded-md h-fit">
            <div className="p-4">
              <h3 className="text-dark dark:text-light font-semibold mb-8">
                Details
              </h3>
              <div className="space-y-5">
                <DropdownLarge
                  key={`status-${taskData.id}`}
                  items={statusOptions}
                  selectedItem={taskData.status}
                  onSelect={handleStatusChange}
                  label="Status"
                  width="full"
                />

                <DropdownLarge
                  key={`priority-${taskData.id}`}
                  items={priorityOptions}
                  selectedItem={taskData.priority}
                  onSelect={handlePriorityChange}
                  label="Priority"
                  width="full"
                />

                <DropdownLarge
                  key={`deadline-${taskData.id}`}
                  items={[]}
                  selectedItem={taskData.deadline || "Set deadline"}
                  onSelect={handleDeadlineChange}
                  label="Deadline"
                  width="full"
                  isDatePicker={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
