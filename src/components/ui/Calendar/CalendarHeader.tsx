import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type CalendarHeaderProps = {
  calendarMonth: number;
  calendarYear: number;
  previousMonth: () => void;
  nextMonth: () => void;
};

const CalendarHeader = ({
  calendarMonth,
  calendarYear,
  previousMonth,
  nextMonth,
}: CalendarHeaderProps) => (
  <div className="flex items-center justify-between mb-4 px-1">
    <button
      className="p-2 rounded-full text-dark hover:text-light dark:text-light hover:bg-gray-300 dark:hover:text-light dark:hover:bg-gray-200 transition-colors duration-300 ease-in-out"
      onClick={previousMonth}
      aria-label="Previous month"
    >
      <FontAwesomeIcon icon={faChevronLeft} className="size-5" />
    </button>
    <div className="flex items-center">
      <h2 className="text-lg font-semibold text-dark dark:text-light tracking-wide">
        {`${new Date(calendarYear, calendarMonth).toLocaleString("default", {
          month: "long",
        })} ${calendarYear}`}
      </h2>
    </div>
    <button
      className="p-2 rounded-full text-dark hover:text-light dark:text-light hover:bg-gray-300 dark:hover:text-light dark:hover:bg-gray-200 transition-colors duration-300 ease-in-out"
      onClick={nextMonth}
      aria-label="Next month"
    >
      <FontAwesomeIcon icon={faChevronRight} className="size-5" />
    </button>
  </div>
);
export default CalendarHeader;
