import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  "aria-label"?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, checked, className = "", ...props }, ref) => {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="relative flex items-center">
          <input
            id={id}
            ref={ref}
            type="checkbox"
            checked={checked}
            className="absolute opacity-0 h-0 w-0"
            {...props}
          />
          <label htmlFor={id} className={`flex items-center cursor-pointer`}>
            <span
              className={`w-4 h-4 flex items-center justify-center border-2 rounded ${
                checked
                  ? "bg-green-200 border-green-200 dark:bg-green-200 dark:border-green-200"
                  : "border-gray-300"
              } ${
                className.includes("text-")
                  ? ""
                  : "text-gray-700 dark:text-light"
              }`}
            >
              {checked && (
                <FontAwesomeIcon
                  icon={faCheck}
                  className={`size-3 text-white ${
                    className.match(/text-\S+/)?.[0] || ""
                  }`}
                />
              )}
            </span>
            {label && <span className="ml-2 text-gray-700">{label}</span>}
          </label>
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
