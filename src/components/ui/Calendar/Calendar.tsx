import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import CalendarGrid from "./CalendarGrid";
import CalendarHeader from "./CalendarHeader";
import TaskListView from "./TaskListView";
import AddTaskView from "./AddTaskView";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useRouter } from "next/router";
import InfoModal from "@/components/modals/InfoModal";

export type RawBackendTask = {
  task_id: number;
  user_id: number;
  project: string;
  task: string;
  status: string;
  description?: string;
  priority: "Low" | "Medium" | "High";
  deadline?: string;
  created_on: string;
};

export type DisplayTask = RawBackendTask & {
  name: string;
  time: string;
};

export type TasksPresence = {
  [key: string]: boolean;
};

const isTodayWithPastTime = (date: Date, time: string): boolean => {
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (!isToday) return false;
  if (!time || time.toLowerCase() === "no time set") return false;

  const [timePartStr, modifier] = time.split(" ");
  const timeParts = timePartStr.split(":").map(Number);

  if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) {
    return false;
  }

  let hours = timeParts[0];
  const minutes = timeParts[1];

  if (modifier) {
    const upperModifier = modifier.toUpperCase();
    if (upperModifier === "PM" && hours < 12) {
      hours += 12;
    } else if (upperModifier === "AM" && hours === 12) {
      hours = 0;
    }
  }

  const taskTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );
  return taskTime < now;
};

const Calendar = () => {
  const router = useRouter();
  const { user_id } = router.query;

  const [displayedTasks, setDisplayedTasks] = useState<DisplayTask[]>([]);
  const [tasksForGrid, setTasksForGrid] = useState<TasksPresence>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newTask, setNewTask] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("12:00 PM");
  const [showTasks, setShowTasks] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isTaskNameValid, setIsTaskNameValid] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [projectInput, setProjectInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingSubTypes, setIsLoadingSubTypes] = useState(true);
  const [showInvalidTimeModal, setShowInvalidTimeModal] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null!);

  const getDateKey = (date: Date): string => date.toISOString().split("T")[0];

  const convertTo24Hour = useCallback((time: string): string => {
    if (!time) {
      return "00:00";
    }
    const [timePartStr, modifier] = time.split(" ");
    const timeParts = timePartStr.split(":").map(Number);

    if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) {
      return "00:00";
    }

    let hours = timeParts[0];
    const minutes = timeParts[1];

    if (modifier) {
      const upperModifier = modifier.toUpperCase();
      if (upperModifier === "PM" && hours < 12) {
        hours += 12;
      } else if (upperModifier === "AM" && hours === 12) {
        hours = 0;
      }
    }
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const formatTaskTime = useCallback((deadline?: string): string => {
    if (!deadline) return "No time set";
    const d = new Date(deadline);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    let displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }, []);

  const processRawTasksToDisplayTasks = useCallback(
    (rawTasks: RawBackendTask[]): DisplayTask[] => {
      return rawTasks.map((task) => ({
        ...task,
        name: task.task,
        time: formatTaskTime(task.deadline),
      }));
    },
    [formatTaskTime]
  );

  const fetchTasksForSelectedDate = useCallback(
    async (date: Date, currentUserId: string | string[] | undefined) => {
      if (!currentUserId || Array.isArray(currentUserId)) return;
      setIsLoadingTasks(true);
      const currentSelectedDateKey = getDateKey(date);

      try {
        const response = await axiosInstance.get(
          `/tasks/${currentUserId}?deadlineDate=${currentSelectedDateKey}`
        );
        const fetchedBackendTasks: RawBackendTask[] =
          response.data?.tasks || [];
        const correctlyFilteredTasks = fetchedBackendTasks.filter((task) => {
          if (!task.deadline) {
            return false;
          }
          const taskDeadlineDateKey = task.deadline.split("T")[0];
          return taskDeadlineDateKey === currentSelectedDateKey;
        });
        setDisplayedTasks(
          processRawTasksToDisplayTasks(correctlyFilteredTasks)
        );
      } catch (error) {
        console.error(
          `Error fetching tasks for ${currentSelectedDateKey}:`,
          error
        );
        setDisplayedTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    },
    [processRawTasksToDisplayTasks]
  ); // Added processRawTasksToDisplayTasks here

  useEffect(() => {
    if (user_id && selectedDate) {
      fetchTasksForSelectedDate(selectedDate, user_id);
    }
  }, [selectedDate, user_id, fetchTasksForSelectedDate]); // Added fetchTasksForSelectedDate here

  const fetchTasksForGridIndicators = useCallback(
    async (currentUserId: string | string[] | undefined) => {
      if (!currentUserId || Array.isArray(currentUserId)) return;
      try {
        const response = await axiosInstance.get(`/tasks/${currentUserId}`);
        const allFetchedTasks: RawBackendTask[] = response.data?.tasks || [];
        const newTasksForGrid: TasksPresence = {};
        allFetchedTasks.forEach((task) => {
          if (task.deadline) {
            const taskDateKey = task.deadline.split("T")[0];
            newTasksForGrid[taskDateKey] = true;
          }
        });
        setTasksForGrid(newTasksForGrid);
      } catch (error) {
        console.error("Error fetching tasks for grid indicators:", error);
        setTasksForGrid({});
      }
    },
    []
  );

  useEffect(() => {
    const fetchUserSubTypes = async () => {
      setIsLoadingSubTypes(true);
      try {
        if (!user_id || Array.isArray(user_id)) return;

        const response = await axiosInstance.get(`/user/${user_id}`);
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
    if (user_id) {
      fetchUserSubTypes();
      fetchTasksForGridIndicators(user_id);
    }
  }, [user_id, fetchTasksForGridIndicators]); // Added fetchTasksForGridIndicators here

  // Redundant useEffect removed - the one above covers selectedDate and user_id
  // useEffect(() => {
  //   if (user_id && selectedDate) {
  //     fetchTasksForSelectedDate(selectedDate, user_id);
  //   }
  // }, [selectedDate, user_id]);

  useEffect(() => {
    if (user_id) {
      fetchTasksForGridIndicators(user_id);
    }
  }, [calendarMonth, calendarYear, user_id, fetchTasksForGridIndicators]); // Added fetchTasksForGridIndicators here

  const handleProjectInputChange = (value: string) => {
    setProjectInput(value);
    const effectiveSubTypes = isLoadingSubTypes ? [] : subTypes;
    if (value.length > 0) {
      const filtered = effectiveSubTypes.filter((subType) =>
        subType.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(effectiveSubTypes);
      setShowSuggestions(true);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setProjectInput(suggestion);
    setShowSuggestions(false);
  };

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowTasks(true);
    setShowAddTask(false);
  };

  const refreshTasksForCurrentView = useCallback(async () => {
    if (user_id) {
      await fetchTasksForSelectedDate(selectedDate, user_id);
      await fetchTasksForGridIndicators(user_id);
    }
  }, [
    user_id,
    selectedDate,
    fetchTasksForSelectedDate,
    fetchTasksForGridIndicators,
  ]);

  const refreshAllTasksAndViews = useCallback(() => {
    refreshTasksForCurrentView();
    setNewTask("");
    setNewTaskTime("12:00 PM");
    setShowAddTask(false);
    setShowTasks(true);
  }, [refreshTasksForCurrentView]);

  const removeTask = async (taskId: number): Promise<void> => {
    try {
      setIsLoadingTasks(true);
      await axiosInstance.delete(`/tasks/delete/${taskId}`);
      await refreshTasksForCurrentView();
    } catch (error: unknown) {
      console.error(
        "Error deleting task:",
        error instanceof Error ? error.message : "Unknown error"
      );
      await refreshTasksForCurrentView();
    }
  };

  const updateTaskStatus = async (
    taskId: number,
    newStatus: string
  ): Promise<void> => {
    try {
      setIsLoadingTasks(true);
      await axiosInstance.put(`/tasks/update/${taskId}`, { status: newStatus });

      setDisplayedTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error: unknown) {
      console.error("Error updating task status:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const generateCalendar = (month: number, year: number): (number | null)[] => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array(firstDay)
      .fill(null)
      .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  };

  const calendarDays = generateCalendar(calendarMonth, calendarYear);

  const previousMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear(calendarYear - 1);
        return 11;
      }
      return prev - 1;
    });
    setShowTasks(false);
    setShowAddTask(false);
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear(calendarYear + 1);
        return 0;
      }
      return prev + 1;
    });
    setShowTasks(false);
    setShowAddTask(false);
  };

  const getDayStatus = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) return "Today";
    if (checkDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isSelectedDatePast = useMemo(() => {
    const selectedOnly = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedOnly < today;
  }, [selectedDate]);

  const currentDate = new Date();
  const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayClasses = (day: number | null): string => {
    let classes =
      "flex items-center justify-center h-10 w-10 rounded-full text-center text-sm font-medium transition-colors duration-150 ease-in-out cursor-pointer ";
    const currentDay = new Date(calendarYear, calendarMonth, day ?? 0);
    currentDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (day === null) {
      classes += "text-gray-300 dark:text-gray-600 cursor-default ";
    } else {
      const isSelected =
        day === selectedDate.getDate() &&
        calendarMonth === selectedDate.getMonth() &&
        calendarYear === selectedDate.getFullYear();
      const isToday =
        day === currentDate.getDate() &&
        calendarMonth === currentDate.getMonth() &&
        calendarYear === currentDate.getFullYear();
      const isPast = currentDay < today;

      if (isSelected) {
        classes += "bg-green-200 text-white shadow-md ";
      } else if (isToday) {
        classes +=
          "text-dark dark:text-light dark:border-blue-400 hover:bg-green-300 dark:hover:bg-green-100 ";
      } else if (isPast) {
        classes +=
          "text-gray-300 dark:text-light cursor-default  hover:bg-gray-500 dark:hover:bg-gray-700 ";
      } else {
        classes +=
          "text-gray-700 dark:text-light hover:bg-gray-400 dark:hover:bg-gray-600 ";
      }
    }
    return classes;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl mx-auto text-gray-800 dark:text-gray-100 relative min-h-[400px]">
      <InfoModal
        isOpen={showInvalidTimeModal}
        onClose={() => setShowInvalidTimeModal(false)}
        title="Invalid Time"
        text="You cannot add tasks to past times on the current day."
        variant="error"
        confirmButtonText="OK"
      />
      {showAddTask ? (
        <AddTaskView
          selectedDate={selectedDate}
          newTask={newTask}
          setNewTask={setNewTask}
          newTaskTime={newTaskTime}
          setNewTaskTime={setNewTaskTime}
          setShowAddTask={setShowAddTask}
          isTaskNameValid={isTaskNameValid}
          setIsTaskNameValid={setIsTaskNameValid}
          projectInput={projectInput}
          handleProjectInputChange={handleProjectInputChange}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          isLoadingSuggestions={isLoadingSubTypes}
          selectSuggestion={selectSuggestion}
          suggestionsRef={suggestionsRef}
          setShowSuggestions={setShowSuggestions}
          userId={Number(user_id)}
          projectName={projectInput}
          refreshTasks={refreshAllTasksAndViews}
          convertTo24Hour={convertTo24Hour}
          isTodayWithPastTimeCheck={isTodayWithPastTime}
          setShowInvalidTimeModal={setShowInvalidTimeModal}
        />
      ) : showTasks ? (
        <TaskListView
          selectedDate={selectedDate}
          tasks={displayedTasks}
          removeTask={removeTask}
          updateTaskStatus={updateTaskStatus}
          setShowTasks={setShowTasks}
          isSelectedDatePast={isSelectedDatePast}
          setShowAddTask={setShowAddTask}
          getDayStatus={getDayStatus}
          isLoading={isLoadingTasks}
        />
      ) : (
        <>
          <CalendarHeader
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            previousMonth={previousMonth}
            nextMonth={nextMonth}
          />
          <CalendarGrid
            calendarDays={calendarDays}
            dayAbbreviations={dayAbbreviations}
            getDayClasses={getDayClasses}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
            handleDateChange={handleDateChange}
            tasksPresence={tasksForGrid}
            getDateKey={getDateKey}
          />
        </>
      )}
    </div>
  );
};

export default Calendar;
