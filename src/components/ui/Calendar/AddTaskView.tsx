import React, { useState } from "react";
import TextField from "../TextField";
import DropdownSmall from "../Dropdown/DropdownSmall";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "../Loader";
import Button from "../Button";

type AddTaskViewProps = {
  selectedDate: Date;
  newTask: string;
  setNewTask: (value: string) => void;
  newTaskTime: string;
  setNewTaskTime: (value: string) => void;
  setShowAddTask: (value: boolean) => void;
  isTaskNameValid: boolean;
  setIsTaskNameValid: (value: boolean) => void;
  projectInput: string;
  handleProjectInputChange: (value: string) => void;
  suggestions: string[];
  showSuggestions: boolean;
  isLoadingSuggestions: boolean;
  selectSuggestion: (suggestion: string) => void;
  suggestionsRef: React.RefObject<HTMLDivElement>;
  setShowSuggestions: (value: boolean) => void;
  userId: number;
  projectName: string;
  refreshTasks: () => void;
  convertTo24Hour: (time: string) => string;
  isTodayWithPastTimeCheck: (date: Date, time: string) => boolean;
  setShowInvalidTimeModal: (value: boolean) => void;
};

const AddTaskView = ({
  selectedDate,
  newTask,
  setNewTask,
  setShowAddTask,
  isTaskNameValid,
  setIsTaskNameValid,
  projectInput,
  handleProjectInputChange,
  suggestions,
  showSuggestions,
  isLoadingSuggestions,
  selectSuggestion,
  suggestionsRef,
  setShowSuggestions,
  userId,
  projectName,
  refreshTasks,
}: AddTaskViewProps) => {
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      setIsTaskNameValid(false);
      return;
    }
    setIsTaskNameValid(true);

    try {
      setIsLoading(true);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const day = selectedDate.getDate().toString().padStart(2, "0");
      const deadlineDateString = `${year}-${month}-${day}`;

      const taskData = {
        user_id: userId,
        project: projectName || projectInput,
        task: newTask.trim(),
        status: "To Do",
        priority,
        deadline: deadlineDateString,
      };

      await axiosInstance.post("/tasks/add", taskData);

      refreshTasks();
    } catch (error: unknown) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Add Task
        </h3>
      </div>
      <p className="text-sm text-dark dark:text-light mb-6">
        {selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="space-y-5">
        <div className="relative">
          <TextField
            label="Category"
            placeholder="Enter or select task category"
            value={projectInput}
            onChange={handleProjectInputChange}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions &&
            (isLoadingSuggestions ? (
              <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 py-1 text-xs p-2 text-gray-400 dark:text-gray-500 shadow-lg">
                <Loader />
              </div>
            ) : (
              suggestions.length > 0 && (
                <div
                  ref={suggestionsRef as React.RefObject<HTMLDivElement>}
                  className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg focus:outline-none sm:text-sm"
                >
                  <p className="text-xs p-2 text-gray-300">Suggestions</p>
                  {suggestions.map((suggestion: string, index: number) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )
            ))}
        </div>
        <TextField
          label="Task"
          placeholder="Enter task name..."
          value={newTask}
          onChange={(val) => {
            setNewTask(val);
            if (val.trim()) setIsTaskNameValid(true);
          }}
          errorMessage={
            !isTaskNameValid && !newTask.trim()
              ? "Task name cannot be empty"
              : ""
          }
        />

        <div className="mb-4">
          <DropdownSmall
            label="Priority"
            placeholder="Select priority"
            items={["Low", "Medium", "High"]}
            selected={priority}
            onSelect={(item) => setPriority(item as "Low" | "Medium" | "High")}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-400 dark:border-gray-600">
          <Button
            text="Add Task"
            style="primary"
            type="submit"
            onClick={handleAddTask}
            isDisabled={!newTask.trim() || !projectInput.trim() || isLoading}
          />

          <Button
            text="Cancel"
            style="secondary"
            onClick={() => setShowAddTask(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default AddTaskView;
