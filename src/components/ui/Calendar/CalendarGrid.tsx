import { TasksPresence } from "./Calendar";

type CalendarGridProps = {
  calendarDays: (number | null)[];
  dayAbbreviations: string[];
  getDayClasses: (day: number | null) => string;
  calendarMonth: number;
  calendarYear: number;
  handleDateChange: (date: Date) => void;
  tasksPresence: TasksPresence;
  getDateKey: (date: Date) => string;
};

const CalendarGrid = ({
  calendarDays,
  dayAbbreviations,
  getDayClasses,
  calendarMonth,
  calendarYear,
  handleDateChange,
  tasksPresence,
  getDateKey,
}: CalendarGridProps) => {
  return (
    <div className="mt-4 animate-fadeIn">
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-dark dark:text-light uppercase tracking-wider">
        {dayAbbreviations.map((dayAbbr) => (
          <div key={dayAbbr} className="pb-1">
            {dayAbbr}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const date = day ? new Date(calendarYear, calendarMonth, day) : null;
          const dateKey = date ? getDateKey(date) : null;
          const hasTasks = day && dateKey && tasksPresence[dateKey]; // Updated to use tasksPresence

          return (
            <div
              key={index}
              className="relative flex items-center justify-center h-12 cursor-pointer"
              onClick={() => day && handleDateChange(date!)}
              role={day ? "button" : undefined}
              tabIndex={day ? 0 : -1}
              aria-label={
                day
                  ? date?.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })
                  : "Empty day"
              }
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && day) {
                  handleDateChange(date!);
                }
              }}
            >
              <div className={getDayClasses(day)}>{day || ""}</div>
              {hasTasks && (
                <span
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-light dark:bg-green-400 rounded-full"
                  title="Tasks present"
                ></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
