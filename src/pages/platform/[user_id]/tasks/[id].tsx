import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import Button from "@/components/ui/Button";
import TicketModal from "@/components/modals/TicketModal";
import TaskModal from "@/components/modals/TaskModal";
import SearchBar from "@/components/ui/SearchBar";
import PlatformLayout from "@/layout/PlatformLayout";
import TicketView from "@/components/ui/Switch/TicketView";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import Head from "next/head";
import { Column, Id, Task } from "@/types/types";
import TaskListView from "./KanbanListView";
import SortableItem from "./SortableItem";
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import axiosInstance from "@/lib/utils/axiosInstance";
import axios from "axios";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";

const formatDeadlineForInput = (
  deadlineString: string | null | undefined
): string => {
  if (!deadlineString) return "";
  try {
    const date = new Date(deadlineString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string received: ${deadlineString}`);
      return "";
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error(`Error formatting date string: ${deadlineString}`, e);
    return "";
  }
};

interface ApiTask {
  task_id: number;
  task: string;
  description?: string | null;
  type?: string | null;
  status: string;
  priority?: string | null;
  deadline?: string | null;
}

const Tasks = () => {
  const router = useRouter();
  const projectTitle = router.query.project as string;
  const userId = router.query.user_id as string;

  const initialColumns: Column[] = [
    { id: "todo", title: "TO DO" },
    { id: "progress", title: "IN PROGRESS" },
    { id: "check", title: "CHECK" },
    { id: "done", title: "DONE" },
  ];

  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>([]);
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [isListView, setIsListView] = useState(false);
  const [taskActionDropdownOpen, setTaskActionDropdownOpen] = useState<{
    taskId: Id;
  } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [activeColumnIdForModal, setActiveColumnIdForModal] =
    useState<Id | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [columnLimits, setColumnLimits] = useState<Record<Id, string>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterLabels, setSelectedFilterLabels] = useState<string[]>(
    []
  );
  const [selectedPriority, setSelectedPriority] = useState<string>("None");
  const dropdownItems = useMemo(() => {
    const labelsFromTasks = tasks.flatMap(
      (t: Task) => t.type?.split(",").map((l: string) => l.trim()) ?? []
    );
    return [
      ...new Set([
        ...labelsFromTasks,
        "Finance",
        "Maintenance",
        "Research",
        "Urgent",
        "Design",
        "Dev",
        "Setup",
        "Bug",
        "DevOps",
      ]),
    ]
      .filter(Boolean)
      .sort();
  }, [tasks]);

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(typeof document !== "undefined");
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectTitle || !userId) return;
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`/tasks/${userId}`, {
          params: { project: projectTitle },
        });
        const fetchedTasks = response.data.tasks || [];

        const mappedTasks: Task[] = fetchedTasks.map(
          (task: ApiTask): Task => ({
            id: task.task_id.toString(),
            task: task.task,
            title: task.task,
            description: task.description || "",
            type: task.type || "",
            columnId: mapStatusToColumnId(task.status),
            status: task.status,
            priority: task.priority || "Medium",
            deadline: formatDeadlineForInput(task.deadline),
          })
        );
        setTasks(mappedTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        Swal.fire("Error", "Could not fetch tasks.", "error");
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [projectTitle, userId]);

  const mapStatusToColumnId = (status: string): Id => {
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

  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((task) => {
      const taskLabels =
        task.type?.split(",").map((l) => l.trim().toLowerCase()) ?? [];
      const filterLabelsLower = selectedFilterLabels.map((l) =>
        l.toLowerCase()
      );
      const searchLower = searchQuery.toLowerCase().trim();
      const labelMatch =
        filterLabelsLower.length === 0 ||
        filterLabelsLower.some((label) => taskLabels.includes(label));
      const searchMatch =
        !searchLower ||
        task.title.toLowerCase().includes(searchLower) ||
        task.id.toString().toLowerCase().includes(searchLower);
      const priorityMatch =
        selectedPriority === "None" ||
        (task.priority &&
          task.priority.toLowerCase() === selectedPriority.toLowerCase());

      return labelMatch && searchMatch && priorityMatch;
    });
  }, [tasks, searchQuery, selectedFilterLabels, selectedPriority]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const updateColumnTitle = (id: Id, title: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, title } : col))
    );
  };

  const addTask = async (columnId: Id, title: string, priority: string) => {
    if (!title.trim()) {
      Swal.fire("Error", "Task title cannot be empty.", "error");
      return;
    }
    try {
      const status = mapColumnIdToStatus(columnId);
      const response = await axiosInstance.post("/tasks/add", {
        user_id: Number(userId),
        project: projectTitle,
        task: title.trim(),
        status,
        description: "",
        priority: priority || "Medium",
      });

      const createdApiTask = response.data;
      const newTask: Task = {
        task: createdApiTask.task,
        id: createdApiTask.task_id.toString(),
        columnId,
        title: createdApiTask.task,
        description: createdApiTask.description || "",
        type: createdApiTask.type || "",
        status: createdApiTask.status,
        priority: createdApiTask.priority,
        deadline: formatDeadlineForInput(createdApiTask.deadline),
      };
      setTasks((prev) => [...prev, newTask]);
    } catch (error) {
      console.error("Failed to add task:", error);
      const msg =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to create task";
      Swal.fire("Error", msg, "error");
    }
  };

  const mapColumnIdToStatus = (columnId: Id): string => {
    switch (columnId) {
      case "todo":
        return "To Do";
      case "progress":
        return "In Progress";
      case "check":
        return "Checks";
      case "done":
        return "Completed";
      default:
        return "To Do";
    }
  };
  const deleteTask = async (taskId: Id) => {
    const taskIdNum =
      typeof taskId === "string" ? parseInt(taskId, 10) : taskId;
    if (isNaN(taskIdNum)) {
      Swal.fire("Error", "Invalid task ID.", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Delete Task?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#04ad79",
      cancelButtonColor: "#bbbbbc",
      confirmButtonText: "Yes",
    });

    if (result.isConfirmed) {
      try {
        await axiosInstance.delete(`/tasks/delete/${taskIdNum}`);
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        setTaskActionDropdownOpen(null);
        if (isTaskModalOpen && selectedTask?.id === taskId) {
          closeTaskModal(false);
        }
        Swal.fire("Deleted!", "The task has been deleted.", "success");
      } catch (error) {
        console.error("Error deleting task:", error);
        const msg =
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Failed to delete task";
        Swal.fire("Error", msg, "error");
      }
    }
  };

  const updateTask = async (updatedTaskData: Task) => {
    const { id, title, status, priority, description, deadline } =
      updatedTaskData;
    const taskIdNum = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(taskIdNum)) {
      Swal.fire("Error", "Invalid task ID for update.", "error");
      throw new Error("Invalid task ID");
    }

    type TaskUpdatePayload = {
      task?: string;
      status?: string;
      priority?: string;
      description?: string | null;
      deadline?: string | null;
    };

    const payload: TaskUpdatePayload = {
      task: title,
      status: status,
      priority: priority,
      description: description ?? null,
      deadline: deadline ? deadline : null,
    };

    try {
      await axiosInstance.put(`/tasks/update/${taskIdNum}`, payload);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, ...updatedTaskData } : task
        )
      );

      if (selectedTask?.id === id) {
        setSelectedTask((prev) =>
          prev ? { ...prev, ...updatedTaskData } : null
        );
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      const msg =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to update task details.";
      Swal.fire("Error", msg, "error");
      throw error;
    }
  };

  const openTicketModal = (colId: Id) => {
    setActiveColumnIdForModal(colId);
    setIsTicketModalOpen(true);
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setActiveColumnIdForModal(null);
  };

  const saveColumnLimit = (limit: string) => {
    if (activeColumnIdForModal !== null) {
      const parsedLimit = limit.trim();
      if (parsedLimit === "" || /^\d+$/.test(parsedLimit)) {
        setColumnLimits((prev) => ({
          ...prev,
          [activeColumnIdForModal]: parsedLimit,
        }));
        closeTicketModal();
      } else {
        Swal.fire("Invalid Limit", "Use numbers or leave blank.", "error");
      }
    } else {
      closeTicketModal();
    }
  };

  const openTaskModal = (task: Task) => {
    const taskToOpen: Task = {
      ...task,
      status: task.status || mapColumnIdToStatus(task.columnId),
      priority: task.priority || "Medium",
      description: task.description || "",
      deadline: task.deadline || "",
    };
    setSelectedTask(taskToOpen);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = (reload = true) => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    if (reload) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const toggleTaskActionDropdown = (taskId: Id) => {
    setTaskActionDropdownOpen((prev) =>
      prev?.taskId === taskId ? null : { taskId }
    );
  };

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (
      !target.closest('[aria-label="ellipsis"]') &&
      !target.closest('[data-dropdown-menu="task"]')
    ) {
      setTaskActionDropdownOpen(null);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setTaskActionDropdownOpen(null);
    if (active.data.current?.type === "Column") {
      setActiveColumn(columns.find((col) => col.id === active.id) || null);
      setActiveTask(null);
    } else if (active.data.current?.type === "Task") {
      setActiveTask(tasks.find((task) => task.id === active.id) || null);
      setActiveColumn(null);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !active || active.id === over.id) return;
    if (active.data.current?.type !== "Task") return;

    /*
    The following logic for optimistic updates during drag is currently disabled.
    To re-enable, uncomment this block.

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id;
    const isOverAColumn = over.data.current?.type === "Column";
    const isOverATask = over.data.current?.type === "Task";

    let targetColumnId: Id | null = null;
    if (isOverAColumn) targetColumnId = overId;
    else if (isOverATask)
      targetColumnId = tasks.find((t) => t.id === overId)?.columnId ?? null;

    if (targetColumnId && activeTask.columnId !== targetColumnId) {
      setTasks((prevTasks) => {
        const activeIndex = prevTasks.findIndex((t) => t.id === active.id);
        if (activeIndex === -1) return prevTasks;
        const updatedTasks = [...prevTasks];
        updatedTasks[activeIndex] = {
          ...updatedTasks[activeIndex],
          columnId: targetColumnId,
        };
        return updatedTasks;
      });
    }
    */
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveColumn(null);
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id;
    const overId = over.id;
    const isActiveAColumn = active.data.current?.type === "Column";
    const isActiveATask = active.data.current?.type === "Task";

    if (isActiveAColumn) {
      setColumns((currentColumns) => {
        const activeIndex = currentColumns.findIndex(
          (col) => col.id === activeId
        );
        const overIndex = currentColumns.findIndex((col) => col.id === overId);
        if (activeIndex === -1 || overIndex === -1) return currentColumns;
        return arrayMove(currentColumns, activeIndex, overIndex);
      });
      return;
    }

    if (isActiveATask) {
      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      const isOverAColumn = over.data.current?.type === "Column";
      const isOverATask = over.data.current?.type === "Task";
      let targetColumnId: Id = activeTask.columnId;

      if (isOverAColumn) {
        targetColumnId = overId;
      } else if (isOverATask) {
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;
        targetColumnId = overTask.columnId;
      } else {
        return;
      }

      setTasks((currentTasks) => {
        const activeIndex = currentTasks.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return currentTasks;

        const taskWithNewColumn = {
          ...currentTasks[activeIndex],
          columnId: targetColumnId,
          status: mapColumnIdToStatus(targetColumnId),
        };

        const tasksWithoutActive = currentTasks.filter(
          (t) => t.id !== activeId
        );

        let finalIndex = tasksWithoutActive.findIndex((t) => t.id === overId);
        if (isOverAColumn) {
          finalIndex = tasksWithoutActive.findIndex(
            (t) => t.columnId === targetColumnId
          );
          if (finalIndex === -1) finalIndex = tasksWithoutActive.length;
        }
        if (finalIndex === -1) finalIndex = tasksWithoutActive.length;

        return [
          ...tasksWithoutActive.slice(0, finalIndex),
          taskWithNewColumn,
          ...tasksWithoutActive.slice(finalIndex),
        ];
      });

      if (activeTask.columnId !== targetColumnId) {
        const newStatus = mapColumnIdToStatus(targetColumnId);

        await updateTask({
          ...activeTask,
          columnId: targetColumnId,
          status: newStatus,
        });

        setTasks((prev) =>
          prev.map((t) =>
            t.id === active.id
              ? { ...t, columnId: targetColumnId, status: newStatus }
              : t
          )
        );
      }
    }
  };

  const toggleView = (view: boolean) => {
    setIsListView(view);
  };

  return (
    <>
      <Head>
        <title>Tasks</title>
      </Head>
      <PlatformLayout>
        <div
          onClick={handlePageClick}
          className="min-h-screen p-4 flex flex-col dark:bg-gray-900"
        >
          <div className="mb-4 px-2">
            <Button
              text="Back"
              style="ghost"
              arrow="left"
              onClick={() => router.back()}
            />
          </div>
          <div className="px-2 mb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h2 className="text-md dark:text-light text-dark">
                Project / {projectTitle || "Loading..."}
              </h2>
            </div>
            <h1 className="text-xl font-bold mt-2 mb-4 dark:text-light">
              {isListView ? "Task List" : "Kanban Board"}
            </h1>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <div className="w-full sm:w-1/3 lg:w-1/4">
                <SearchBar
                  placeholder="Search Title or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                {selectedFilterLabels.length > 0 && (
                  <Button
                    text="Clear Filters"
                    style="secondary"
                    width="small"
                    onClick={() => setSelectedFilterLabels([])}
                  />
                )}
                <DropdownSmall
                  items={["None", "Low", "Medium", "High"]}
                  direction="down"
                  placeholder="Priority"
                  selected={selectedPriority}
                  onSelect={setSelectedPriority}
                />
                <TicketView isListView={isListView} toggleView={toggleView} />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center flex-grow">
              <p className="text-dark dark:text-light">Loading tasks...</p>
            </div>
          ) : isListView ? (
            <TaskListView
              tasks={filteredTasks}
              columns={columns}
              openTaskModal={openTaskModal}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
            >
              <div className="flex-grow flex gap-4 overflow-x-auto pb-4 px-2">
                <SortableContext
                  items={columnsId}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((col) => {
                    const tasksForColumn = filteredTasks.filter(
                      (task) => task.columnId === col.id
                    );
                    return (
                      <SortableItem key={col.id} id={col.id} isColumn>
                        <ColumnContainer
                          column={col}
                          tasks={tasksForColumn}
                          userId={Number(userId)}
                          projectTitle={projectTitle}
                          updateColumnTitle={updateColumnTitle}
                          openTicketModal={openTicketModal}
                          addTask={addTask}
                          dropdownItems={dropdownItems}
                          openTaskModal={openTaskModal}
                          deleteTask={deleteTask}
                          toggleDropdown={toggleTaskActionDropdown}
                          dropdownOpen={
                            taskActionDropdownOpen
                              ? {
                                  colId: col.id,
                                  taskId: taskActionDropdownOpen.taskId,
                                }
                              : null
                          }
                          openLabelPopup={() =>
                            console.warn("Label popup not implemented")
                          }
                        />
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </div>
              {isBrowser &&
                createPortal(
                  <DragOverlay dropAnimation={null}>
                    {activeColumn && (
                      <ColumnContainer
                        column={activeColumn}
                        tasks={tasks.filter(
                          (t) => t.columnId === activeColumn.id
                        )}
                        userId={Number(userId)}
                        projectTitle={projectTitle}
                        updateColumnTitle={() => {}}
                        openTicketModal={() => {}}
                        addTask={() => {}}
                        dropdownItems={dropdownItems}
                        openTaskModal={() => {}}
                        toggleDropdown={() => {}}
                        deleteTask={() => {}}
                        openLabelPopup={() => {}}
                        dropdownOpen={null}
                        isOverlay={true}
                      />
                    )}
                    {activeTask && (
                      <TaskCard
                        task={activeTask}
                        openTaskModal={() => {}}
                        toggleDropdown={() => {}}
                        deleteTask={() => {}}
                        openLabelPopup={() => {}}
                        dropdownOpen={null}
                        isOverlay={true}
                      />
                    )}
                  </DragOverlay>,
                  document.body
                )}
            </DndContext>
          )}

          <TicketModal
            isOpen={isTicketModalOpen}
            columnName={
              activeColumnIdForModal
                ? columns.find((c) => c.id === activeColumnIdForModal)?.title ??
                  ""
                : ""
            }
            currentLimit={
              activeColumnIdForModal
                ? columnLimits[activeColumnIdForModal] || ""
                : ""
            }
            onSave={saveColumnLimit}
            onCancel={closeTicketModal}
          />

          {selectedTask && isTaskModalOpen && (
            <TaskModal
              isOpen={isTaskModalOpen}
              taskDetails={{
                ...selectedTask,
                id: String(selectedTask.id),
                columnId: String(selectedTask.columnId),
                status: selectedTask.status,
                priority: selectedTask.priority,
                description: selectedTask.description,
                deadline: selectedTask.deadline,
              }}
              updateTask={(updatedTask) =>
                updateTask({ ...updatedTask, task: updatedTask.title })
              }
              deleteTask={deleteTask}
              projectName={projectTitle || "Project"}
              availableLabels={dropdownItems}
              onClose={() => closeTaskModal(true)}
            />
          )}
        </div>
      </PlatformLayout>
    </>
  );
};

export default Tasks;
