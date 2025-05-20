import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useRef, useEffect } from "react";

type Props = {
  items: string[];
  selectedItem: string;
  onSelect: (item: string) => void;
  type?: "form" | "";
  label?: string;
  width?: "full" | "half" | "auto";
  isDatePicker?: boolean;
};

const DropdownLarge = ({
  items,
  selectedItem,
  onSelect,
  type = "",
  label = "",
  width = "auto",
  isDatePicker = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectItem = (item: string) => {
    onSelect(item);
    setIsOpen(false);
  };

  const displayLabel =
    type === "form" && !selectedItem ? "Please Select" : selectedItem;

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

  if (isDatePicker) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="date"
          value={selectedItem === "Set deadline" ? "" : selectedItem}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-dark dark:text-light"
        />
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-200 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        ref={dropdownRef}
        className={`relative inline-block text-left ${
          type === "form" ? "border border-gray-300 rounded-md" : ""
        } ${
          width === "full" ? "w-full" : width === "half" ? "w-1/2" : "w-auto"
        }`}
      >
        {/* Selected Item Button */}
        <button
          className="flex text-dark dark:text-light items-center justify-between px-4 py-2 text-sm w-full"
          onClick={toggleDropdown}
          type="button"
        >
          {displayLabel}
          <FontAwesomeIcon
            icon={faChevronDown}
            className="size-5 ml-2 -mr-1 text-gray-300"
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <ul className="absolute z-10 mt-2 bg-white dark:bg-dark rounded-md shadow-lg text-center max-h-40 overflow-y-auto w-full">
            {items.map((item) => (
              <li
                key={item}
                className="px-4 py-2 text-dark dark:text-light text-sm font-medium cursor-pointer hover:bg-gray-400 dark:hover:bg-dark-100"
                onClick={() => selectItem(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DropdownLarge;
