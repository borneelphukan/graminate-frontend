import React, { InputHTMLAttributes } from "react";

interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const RadioButton = ({
  label,
  id,
  className,
  checked,
  ...props
}: RadioButtonProps) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={id}
        type="radio"
        className="hidden peer"
        checked={checked}
        {...props}
      />
      <label htmlFor={id} className="flex items-center cursor-pointer group">
        <span
          className={`
          w-4 h-4 inline-block mr-2 rounded-full border
          ${
            checked
              ? "border-green-200 bg-white dark:bg-gray-800"
              : "border-gray-300 bg-white dark:bg-gray-800"
          }
          relative transition-all duration-200
          group-hover:border-green-100
        `}
        >
          <span
            className={`
            absolute inset-1/2 transform -translate-x-1/2 -translate-y-1/2 
            w-2.5 h-2.5 rounded-full bg-green-200
            ${checked ? "opacity-100" : "opacity-0"}
            transition-opacity duration-200
          `}
          ></span>
        </span>
        <span
          className={`
          text-dark dark:text-light 
          ${checked ? "text-green-200 font-medium" : ""}
          transition-colors duration-200
        `}
        >
          {label}
        </span>
      </label>
    </div>
  );
};

export default RadioButton;
