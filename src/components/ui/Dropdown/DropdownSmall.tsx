import { useState, useRef, useEffect } from "react";

type Props = {
  items: string[] | Record<string, string[]>;
  selected: string;
  onSelect: (item: string) => void;
  direction?: "up" | "down";
  label?: string | null;
  placeholder?: string;
  disabledItems?: string[];
};

const DropdownSmall = ({
  items,
  selected,
  onSelect,
  direction = "down",
  label = null,
  placeholder = "Select an option",
  disabledItems = [],
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownId = `dropdown-${Math.random().toString(36).substring(2, 15)}`;

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (item: string) => {
    if (disabledItems.includes(item)) return;
    onSelect(item);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const buttonTextClasses = selected
    ? "text-dark dark:text-light"
    : "text-gray-300 dark:text-light";

  const renderItems = () => {
    if (Array.isArray(items)) {
      return items.map((item) => (
        <li
          key={item}
          role="option"
          tabIndex={0}
          className={`px-4 py-2 text-sm ${
            disabledItems.includes(item)
              ? "font-semibold text-dark dark:text-gray-300 bg-gray-500 dark:bg-gray-800 cursor-default"
              : "text-dark dark:text-gray-300 hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer"
          }`}
          onClick={() => handleSelect(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleSelect(item);
            }
          }}
          aria-selected={selected === item && !disabledItems.includes(item)}
          aria-disabled={disabledItems.includes(item)}
        >
          {item}
        </li>
      ));
    } else {
      return Object.entries(items).map(([groupName, groupItems]) => (
        <div key={groupName}>
          <li className="px-4 py-2 text-sm font-medium text-dark dark:text-gray-300 bg-light dark:bg-gray-800">
            --- {groupName} ---
          </li>
          {groupItems.map((item) => (
            <li
              key={item}
              role="option"
              tabIndex={0}
              className="px-6 py-2 text-sm text-dark dark:text-gray-300 hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => handleSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelect(item);
                }
              }}
              aria-selected={selected === item}
            >
              {item}
            </li>
          ))}
        </div>
      ));
    }
  };

  return (
    <div className="relative w-full md:w-auto" ref={dropdownRef}>
      {label && (
        <label
          htmlFor={dropdownId}
          className="block mb-1 text-sm font-medium text-dark dark:text-gray-300"
        >
          {label}
        </label>
      )}

      <button
        id={dropdownId}
        type="button"
        className={`w-full flex items-center justify-between p-2.5 text-sm rounded-md
                    border border-gray-400 dark:border-gray-200 
                     dark:bg-gray-700 
                    focus:outline-none focus:ring-1 focus:ring-green-200`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${buttonTextClasses}`}>
          {selected || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 ml-2 text-gray-300 dark:text-gray-500 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          className={`absolute ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          } left-0 w-full 
                     bg-white dark:bg-gray-700 
                     border border-gray-500 dark:border-gray-600 
                     rounded-md shadow-lg 
                     max-h-60 overflow-y-auto z-10`}
          role="listbox"
          aria-labelledby={dropdownId}
        >
          {renderItems()}
        </ul>
      )}
    </div>
  );
};

export default DropdownSmall;
