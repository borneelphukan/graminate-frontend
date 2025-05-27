import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type ToggleOption<T extends string> = {
  value: T;
  label: string;
  icon: IconDefinition;
};

type ToggleSwitchProps<T extends string> = {
  options: ToggleOption<T>[];
  activeOption: T;
  onToggle: (option: T) => void;
};

const ToggleSwitch = <T extends string>({
  options,
  activeOption,
  onToggle,
}: ToggleSwitchProps<T>) => {
  return (
    <div className="flex items-center space-x-1 bg-light dark:bg-gray-700 p-1 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onToggle(option.value)}
          aria-pressed={activeOption === option.value}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out flex items-center space-x-2 ${
            activeOption === option.value
              ? "bg-white dark:bg-gray-600 text-blue-200 dark:text-blue-300 shadow-md"
              : "text-dark dark:text-light hover:bg-gray-300/50 dark:hover:bg-dark/50"
          }`}
        >
          <FontAwesomeIcon icon={option.icon} className="size-4" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ToggleSwitch;
