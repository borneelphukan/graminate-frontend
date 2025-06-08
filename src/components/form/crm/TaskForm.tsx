import React, { useState, useRef, useEffect } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import { triggerToast } from "@/stores/toast";

type TaskFormProps = {
  userId: string | string[] | undefined;
  onClose: () => void;
};

const TaskForm = ({ userId, onClose }: TaskFormProps) => {
  const [projectValue, setProjectValue] = useState("");
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
    setProjectValue(val);
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
    setProjectValue(suggestion);
    setShowSuggestions(false);
  };

  const handleProjectInputFocus = () => {
    if (subTypes.length > 0) {
      setSuggestions(subTypes);
      setShowSuggestions(true);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectValue) {
      triggerToast("Please fill in Project Name.", "error");
      return;
    }
    const payload = {
      user_id: Number(userId),
      project: projectValue,
    };
    try {
      const response = await axiosInstance.post("/tasks/add", payload);
      if (response.data && response.data.task_id) {
        setProjectValue("");
        triggerToast("Project created successfully!", "success");
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
    <form
      className="flex flex-col gap-4 w-full"
      onSubmit={handleSubmitCategory}
    >
      <div className="relative">
        <TextField
          label="Project Name / Task Category"
          placeholder="e.g. Poultry"
          value={projectValue}
          onChange={handleProjectInputChange}
          onFocus={handleProjectInputFocus}
          isLoading={isLoadingSubTypes}
        />
        {suggestions.length > 0 && showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            <p className="text-xs p-2 text-gray-300">Default Options</p>
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
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
        <Button text="Cancel" style="secondary" onClick={onClose} />
        <Button text="Create Project" style="primary" type="submit" />
      </div>
    </form>
  );
};

export default TaskForm;
