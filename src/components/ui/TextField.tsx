import {
  faEye,
  faEyeSlash,
  faInfoCircle,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useRef, useEffect } from "react";
import Loader from "./Loader";

type Props = {
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  type?: "success" | "error" | "disabled" | "";
  icon?: "left" | "right" | "";
  calendar?: boolean;
  password?: boolean;
  number?: boolean;
  value: string;
  onChange: (val: string) => void;
  width?: "small" | "medium" | "large" | "";
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  suggestions?: string[];
  isLoading?: boolean;
};

const TextField = ({
  label = "",
  placeholder = "",
  errorMessage = "This cannot be left blank",
  isDisabled = false,
  type = "",
  icon = "",
  calendar = false,
  password = false,
  number = false,
  value,
  onChange,
  width = "",
  onBlur,
  onKeyDown,
  onFocus,
  suggestions = [],
  isLoading = false,
}: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textFieldRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      textFieldRef.current &&
      !textFieldRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getFieldClass = () => {
    switch (type) {
      case "error":
        return "border border-red-200 text-gray-100 placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-red-200";
      case "disabled":
        return "border border-gray-400 opacity-50 text-gray-100 placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-red-200";
      default:
        return "border border-gray-400 dark:border-gray-200 text-gray-100 placeholder-gray-300 text-sm dark:bg-gray-700 dark:text-light rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-green-200";
    }
  };

  const getWidthClass = () => {
    switch (width) {
      case "small":
        return "w-1/4";
      case "medium":
        return "w-1/2";
      case "large":
        return "w-full";
      default:
        return "w-auto";
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFocus = () => {
    if (onFocus) onFocus();
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`w-full ${getWidthClass()}`} ref={textFieldRef}>
      {label && (
        <label
          htmlFor={calendar ? "calendar" : password ? "password" : "text"}
          className="block mb-1 text-sm font-medium text-gray-200 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          className={`${getFieldClass()} ${
            icon === "left" ? "pl-10" : icon === "right" ? "pr-10" : ""
          }`}
          disabled={isDisabled}
          type={
            calendar
              ? "date"
              : password
              ? showPassword
                ? "text"
                : "password"
              : number
              ? "number"
              : "text"
          }
          id={calendar ? "calendar" : password ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />

        {password && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <FontAwesomeIcon icon={faEyeSlash} className="size-4" />
            ) : (
              <FontAwesomeIcon icon={faEye} className="size-4" />
            )}
          </button>
        )}

        {suggestions.length > 0 && !password && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
            onClick={() => setShowSuggestions(!showSuggestions)}
            aria-label="Toggle suggestions"
          >
            <FontAwesomeIcon icon={faChevronDown} className="size-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
              <Loader/>
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </div>
            ))
          )}
        </div>
      )}

      {type === "error" && (
        <div className="flex items-center mt-1">
          <span className="font-medium mr-1">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="size-6 text-red-200"
            />
          </span>
          <p className="text-sm text-red-200">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default TextField;
