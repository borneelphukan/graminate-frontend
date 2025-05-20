import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type TaskFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const TaskForm = ({ userId, onClose }: TaskFormProps) => {
  const [taskValues, setTaskValues] = useState({
    project: "",
    task: "",
    status: "To Do",
    priority: "Medium",
    deadline: "",
  });

  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      setIsLoadingSubTypes(true);
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const user = response.data?.data?.user ?? response.data?.user;
        if (!user) throw new Error("User payload missing");
        setSubTypes(Array.isArray(user.sub_type) ? user.sub_type : []);
      } catch (err) {
        console.error("Error fetching user sub_types:", err);
        setSubTypes([]);
      } finally {
        setIsLoadingSubTypes(false);
      }
    };
    if (userId) {
      fetchUserSubTypes();
    }
  }, [userId]);

  const handleProjectInputChange = (val: string) => {
    setTaskValues({ ...taskValues, project: val });
    if (val.length > 0) {
      const filtered = subTypes.filter((subType) =>
        subType.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(subTypes);
      setShowSuggestions(true);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setTaskValues({ ...taskValues, project: suggestion });
    setShowSuggestions(false);
  };

  const handleProjectInputFocus = () => {
    if (subTypes.length > 0) {
      setSuggestions(subTypes);
      setShowSuggestions(true);
    }
  };

  const handleSubmitTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskValues.project || !taskValues.task) {
      triggerToast(
        "Please fill in Task Category and Task description.",
        "error"
      );
      return;
    }
    const payload = {
      user_id: userId,
      project: taskValues.project,
      task: taskValues.task,
      status: "To Do",
      priority: taskValues.priority || "Medium",
      deadline: taskValues.deadline || null,
    };
    try {
      const response = await axiosInstance.post("/tasks/add", payload);
      if (response.data && response.data.task) {
        setTaskValues({
          project: "",
          task: "",
          status: "To Do",
          priority: "Medium",
          deadline: "",
        });
        triggerToast("Task added successfully!", "success");
        onClose();
        window.location.reload();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "An unexpected error occurred";
      triggerToast(`Error: ${message}`, "error");
    }
  };

  return (
    <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmitTasks}>
      <div className="relative">
        <TextField
          label="Task Category"
          placeholder="e.g. Poultry"
          value={taskValues.project}
          onChange={handleProjectInputChange}
          onFocus={handleProjectInputFocus}
          isLoading={isLoadingSubTypes}
        />
        {suggestions.length > 0 && showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg"
          >
            <p className="text-xs p-2 text-gray-300">Suggestions...</p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-light dark:hover:bg-gray-800 text-sm cursor-pointer"
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <TextField
        label="First Assigned Task"
        placeholder="Your task here"
        value={taskValues.task}
        onChange={(val: string) => setTaskValues({ ...taskValues, task: val })}
      />
      <DropdownLarge
        items={["Low", "Medium", "High"]}
        selectedItem={taskValues.priority}
        onSelect={(value: string) =>
          setTaskValues({ ...taskValues, priority: value })
        }
        type="form"
        label="Priority"
        width="full"
      />
      <TextField
        label="Deadline"
        placeholder="YYYY-MM-DD"
        value={taskValues.deadline}
        onChange={(val: string) =>
          setTaskValues({ ...taskValues, deadline: val })
        }
        calendar
      />
      <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-400 dark:border-gray-200">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Task" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default TaskForm;
