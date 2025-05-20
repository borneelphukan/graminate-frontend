import React, { useState, useMemo } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Button from "@/components/ui/Button";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import TextArea from "@/components/ui/TextArea";
import SortableItem from "./SortableItem";
import TaskCard from "./TaskCard";
import { Column, Id, Task } from "@/types/types";
import InfoModal from "@/components/modals/InfoModal";

type ColumnContainerProps = {
  column: Column;
  tasks: Task[];
  userId: number;
  projectTitle: string;
  deleteColumn?: (id: Id) => void;
  updateColumnTitle?: (id: Id, title: string) => void;
  openTicketModal: (colId: Id) => void;
  addTask: (columnId: Id, title: string, type: string) => void;
  dropdownItems: string[];
  openTaskModal: (task: Task) => void;
  toggleDropdown: (colId: Id, taskId: Id) => void;
  deleteTask: (taskId: Id) => void;
  openLabelPopup: (taskId: Id) => void;
  dropdownOpen: { colId: Id; taskId: Id } | null;
  isOverlay?: boolean;
};

const ColumnContainer = ({
  column,
  tasks = [],
  updateColumnTitle,
  addTask,
  openTaskModal,
  toggleDropdown,
  deleteTask,
  openLabelPopup,
  dropdownOpen,
  isOverlay = false,
}: ColumnContainerProps) => {
  const [editMode, setEditMode] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [infoModalState, setInfoModalState] = useState({
    isOpen: false,
    title: "",
    text: "",
    variant: "info" as "success" | "error" | "info" | "warning",
  });

  const validTasks = useMemo(() => tasks.filter(Boolean), [tasks]);
  const tasksIds = useMemo(
    () => validTasks.map((task) => task.id),
    [validTasks]
  );

  if (!column) {
    return null;
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      setInfoModalState({
        isOpen: true,
        title: "Task cannot be added",
        text: "Please provide a title for the task",
        variant: "error",
      });
      return;
    }

    addTask(column.id, newTaskTitle.trim(), newTaskPriority);
    setNewTaskTitle("");
    setNewTaskPriority("Medium");
    setIsAddingTask(false);
  };

  return (
    <div
      className={`bg-gray-500 dark:bg-gray-800 shadow-md rounded-lg p-3 w-full sm:w-[270px] flex-shrink-0 flex flex-col max-h-[calc(100vh-240px)] ${
        isOverlay ? "opacity-90 cursor-grabbing" : ""
      }`}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          {!editMode ? (
            <h2
              title={column.title}
              className="text-sm font-semibold dark:text-light cursor-pointer truncate"
              onClick={() => !isOverlay && setEditMode(true)}
            >
              {column.title}
            </h2>
          ) : (
            <input
              type="text"
              value={column.title}
              onChange={(e) =>
                updateColumnTitle &&
                updateColumnTitle(column.id, e.target.value)
              }
              onBlur={() => setEditMode(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setEditMode(false);
              }}
              autoFocus
              className="bg-transparent border-b border-gray-400 dark:border-gray-600 focus:outline-none text-sm font-semibold dark:text-light w-full"
            />
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-hidden space-y-3 mb-3 pr-1">
        <SortableContext
          items={tasksIds}
          strategy={verticalListSortingStrategy}
        >
          {validTasks.map((task) => (
            <SortableItem key={task.id} id={task.id}>
              <TaskCard
                task={task}
                openTaskModal={openTaskModal}
                toggleDropdown={toggleDropdown}
                deleteTask={deleteTask}
                openLabelPopup={openLabelPopup}
                dropdownOpen={dropdownOpen}
              />
            </SortableItem>
          ))}
        </SortableContext>
      </div>

      {!isOverlay && (
        <>
          {isAddingTask ? (
            <div className="mt-auto py-3 bg-gray-500 dark:bg-gray-700">
              <div className=" bg-white dark:border-gray-300 rounded-lg">
                <TextArea
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={setNewTaskTitle}
                />
              </div>

              <div className="mt-3 flex flex-col mx-auto gap-2">
                <DropdownSmall
                  items={["Low", "Medium", "High"]}
                  direction="down"
                  placeholder="Select Priority"
                  selected={newTaskPriority}
                  onSelect={setNewTaskPriority}
                />

                <div className="flex justify-start gap-2 ">
                  <Button
                    text="Add"
                    style="primary"
                    width="large"
                    onClick={handleAddTask}
                  />
                  <Button
                    text="Cancel"
                    style="secondary"
                    width="large"
                    onClick={() => setIsAddingTask(false)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-auto pt-2">
              <Button
                text="Create Issue"
                style="primary"
                add
                width="large"
                onClick={() => setIsAddingTask(true)}
              />
            </div>
          )}
        </>
      )}

      <InfoModal
        isOpen={infoModalState.isOpen}
        onClose={() =>
          setInfoModalState((prev) => ({ ...prev, isOpen: false }))
        }
        title={infoModalState.title}
        text={infoModalState.text}
        variant={infoModalState.variant}
      />
    </div>
  );
};

export default ColumnContainer;
