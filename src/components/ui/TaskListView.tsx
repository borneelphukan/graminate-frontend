import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "./Button";
import React from "react";

type TaskListViewProps = {
  selectedDate: Date;
  tasks: { name: string; time: string }[];
  removeTask: (index: number) => void;
  setShowTasks: (value: boolean) => void;
  isSelectedDatePast: boolean;
  setShowAddTask: (value: boolean) => void;
  getDayStatus: (date: Date) => string;
  canAddTask: boolean;
};

const TaskListView = ({
  selectedDate,
  tasks,
  removeTask,
  setShowTasks,
  isSelectedDatePast,
  setShowAddTask,
  getDayStatus,
}: TaskListViewProps) => (
  <>
    <h3 className="text-lg font-bold mb-4 text-dark dark:text-light">
      Tasks for {getDayStatus(selectedDate)}
    </h3>

    <div className="mt-4 flex justify-between space-x-4 mb-4">
      <Button
        text=""
        style="ghost"
        arrow="left"
        onClick={() => setShowTasks(false)}
      />

      {!isSelectedDatePast && (
        <button
          aria-label="add tasks"
          className="bg-green-200 hover:bg-green-100 text-white px-2 py-1 rounded-full"
          onClick={() => setShowAddTask(true)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}
    </div>
    <ul className="list-disc pl-5 space-y-5">
      {tasks.length === 0 ? (
        <p className="text-center text-gray-300 dark:text-light mt-5">
          No task today
        </p>
      ) : (
        tasks.map((task, index) => (
          <li key={index} className="flex items-center justify-between">
            <span className="text-dark dark:text-light">
              {task.time} - {task.name}
            </span>
            <button
              className="text-red-600 hover:text-red-800"
              onClick={() => removeTask(index)}
            >
              <FontAwesomeIcon icon={faTrash} className="size-4" />
            </button>
          </li>
        ))
      )}
    </ul>
  </>
);

export default TaskListView;
