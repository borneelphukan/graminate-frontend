import { useState, useEffect, useCallback } from "react";
import TextField from "@/components/ui/TextField";
import DropdownLarge from "@/components/ui/Dropdown/DropdownLarge";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { PRIORITY_OPTIONS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import Checkbox from "@/components/ui/Checkbox";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = "To Do" | "In Progress" | "Checks" | "Completed";

type Task = {
  task_id: number;
  user_id: number;
  project: string;
  task: string;
  status: TaskStatus;
  priority: Priority;
  created_on: string;
};

type Props = {
  userId: number;
  projectType: string;
};

const TaskManager = ({ userId, projectType }: Props) => {
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [prioritySortAsc, setPrioritySortAsc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);

  const sortTasks = useCallback((list: Task[], asc: boolean) => {
    const priorityRankLocal: Record<Priority, number> = {
      High: 1,
      Medium: 2,
      Low: 3,
    };

    const sorted = [...list].sort((a, b) => {
      const aRank = priorityRankLocal[a.priority];
      const bRank = priorityRankLocal[b.priority];
      return asc ? aRank - bRank : bRank - aRank;
    });

    return [
      ...sorted.filter((t) => t.status === "To Do"),
      ...sorted.filter((t) => t.status === "In Progress"),
      ...sorted.filter((t) => t.status === "Checks"),
      ...sorted.filter((t) => t.status === "Completed"),
    ];
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId || !projectType) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await axiosInstance.get(`/tasks/${userId}`, {
          params: {
            project: projectType,
          },
        });

        const tasks = Array.isArray(response.data)
          ? response.data
          : response.data.tasks || [];

        setTaskList(sortTasks(tasks, prioritySortAsc));
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [userId, projectType, prioritySortAsc, sortTasks]);

  const handlePriorityChange = async (
    taskId: number,
    newPriority: Priority
  ) => {
    try {
      const response = await axiosInstance.put(`/tasks/update/${taskId}`, {
        priority: newPriority,
      });

      setTaskList((prev) =>
        sortTasks(
          prev.map((t) => (t.task_id === taskId ? response.data : t)),
          prioritySortAsc
        )
      );
      setEditingPriority(null);
    } catch (err) {
      console.error("Failed to update priority:", err);
      setError("Failed to update task priority. Please try again.");
    }
  };

  const toggleTaskCompletion = async (taskId: number) => {
    try {
      const task = taskList.find((t) => t.task_id === taskId);
      if (!task) return;

      const newStatus = task.status === "Completed" ? "To Do" : "Completed";

      const response = await axiosInstance.put(`/tasks/update/${taskId}`, {
        status: newStatus,
      });

      setTaskList((prev) =>
        sortTasks(
          prev.map((t) => (t.task_id === taskId ? response.data : t)),
          prioritySortAsc
        )
      );
    } catch (err) {
      console.error("Failed to update task:", err);
      setError("Failed to update task status. Please try again.");
    }
  };

  const addNewTask = async () => {
    if (!newTaskText.trim() || !userId || !projectType) return;

    try {
      const response = await axiosInstance.post("/tasks/add", {
        user_id: userId,
        project: projectType,
        task: newTaskText.trim(),
        status: "To Do",
        priority: newTaskPriority,
      });

      setTaskList((prev) =>
        sortTasks([...prev, response.data], prioritySortAsc)
      );
      setNewTaskText("");
      setNewTaskPriority("Medium");
      setError(null);
    } catch (err) {
      console.error("Failed to create task:", err);
      setError("Failed to create new task. Please try again.");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await axiosInstance.delete(`/tasks/delete/${taskId}`);
      // Deleting doesn't require re-sorting the whole list, just filtering.
      // However, to maintain consistency if sortTasks did more, we could call it.
      // For now, simple filter is fine and doesn't need sortTasks.
      setTaskList((prev) => prev.filter((task) => task.task_id !== taskId));
      setError(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError("Failed to delete task. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const capitalizedProjectType =
    projectType.charAt(0).toUpperCase() + projectType.slice(1);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-dark dark:text-light">
          {capitalizedProjectType} Task List
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-dark text-xs font-semibold px-2.5 py-0.5 rounded dark:text-light">
            {taskList.filter((t) => t.status !== "Completed").length} Active /{" "}
            {taskList.length} Total
          </span>
          <button
            onClick={() => {
              const newAsc = !prioritySortAsc;
              setPrioritySortAsc(newAsc);
              setTaskList((prevList) => sortTasks(prevList, newAsc));
            }}
            className="text-sm bg-gray-500 dark:bg-gray-700 text-dark dark:text-light px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-600 flex items-center cursor-pointer"
          >
            Priority Sorting
            <span className="ml-2">
              <FontAwesomeIcon
                icon={prioritySortAsc ? faChevronUp : faChevronDown}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
        <TextField
          placeholder={`Add new ${projectType.toLowerCase()} task`}
          value={newTaskText}
          onChange={(val: string) => setNewTaskText(val)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              addNewTask();
            }
          }}
        />
        <DropdownLarge
          items={PRIORITY_OPTIONS}
          selectedItem={newTaskPriority}
          onSelect={(item) => setNewTaskPriority(item as Priority)}
          width="auto"
        />
        <Button
          text="Task"
          style="primary"
          onClick={addNewTask}
          isDisabled={!newTaskText.trim()}
          add
        />
      </div>

      <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {taskList.map((task) => (
          <li
            key={task.task_id}
            className="flex items-center p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Checkbox
              id={`task-${task.task_id}`}
              checked={task.status === "Completed"}
              onChange={() => toggleTaskCompletion(task.task_id)}
              className="mr-3 flex-shrink-0"
            />
            <span
              className={`text-sm flex-1 ${
                task.status === "Completed"
                  ? "line-through text-gray-300"
                  : "text-dark dark:text-gray-300"
              }`}
            >
              {task.task}
            </span>

            {task.status === "Completed" ? (
              <button
                onClick={() => deleteTask(task.task_id)}
                className="ml-2 text-xs font-semibold bg-red-200 text-light px-2 py-1 rounded  hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            ) : editingPriority === task.task_id ? (
              <div className="ml-2 flex gap-1">
                {(["High", "Medium", "Low"] as Priority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityChange(task.task_id, priority)}
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      priority === "High"
                        ? "bg-red-200 text-light"
                        : priority === "Medium"
                        ? "bg-yellow-200 text-dark"
                        : "bg-green-200 text-light"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
                <button
                  onClick={() => setEditingPriority(null)}
                  className="text-xs font-medium px-2 py-1 rounded bg-gray-400 text-dark hover:bg-gray-300"
                >
                  <FontAwesomeIcon icon={faXmark} className="size-2" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingPriority(task.task_id)}
                className={`ml-2 text-xs font-medium px-2 py-1 rounded ${
                  task.priority === "High"
                    ? "bg-red-100 text-light hover:bg-red-200"
                    : task.priority === "Medium"
                    ? "bg-yellow-200 text-dark"
                    : "bg-green-200 text-light"
                }`}
              >
                {task.priority}
              </button>
            )}
          </li>
        ))}
        {taskList.length === 0 && (
          <li className="text-center text-gray-300 dark:text-gray-400 py-4">
            No tasks found. Add your first {projectType.toLowerCase()} task
          </li>
        )}
      </ul>
    </div>
  );
};

export default TaskManager;
