import { faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type TicketViewProps = {
  isListView: boolean;
  toggleView: (view: boolean) => void;
};

const TicketView = ({ isListView, toggleView }: TicketViewProps) => {
  return (
    <div className="flex items-center space-x-2 hover:bg-gray-400 dark:hover:bg-gray-800 rounded-md">
      {/* Kanban View Icon */}
      <button
        className="p-2 focus:outline-none dark:focus:bg-gray-700 focus:bg-gray-300 focus:text-dark dark:focus:text-light rounded-l-md"
        onClick={() => {
          if (isListView) {
            toggleView(false);
          }
        }}
        aria-label="Switch to Kanban View"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0 .515.045.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
          />
        </svg>
      </button>

      {/* List View Icon */}
      <button
        className="p-2 focus:outline-none dark:focus:bg-gray-700 focus:bg-gray-300 focus:text-dark dark:focus:text-light rounded-r-md"
        onClick={() => {
          if (!isListView) {
            toggleView(true);
          }
        }}
        aria-label="Switch to List View"
      >
        <FontAwesomeIcon icon={faList} className="size-6" />
      </button>
    </div>
  );
};

export default TicketView;
