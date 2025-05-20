import React, { ReactNode } from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  icon?: ReactNode;
  confirmButtonText?: string;
  confirmButtonColorClass?: string;
  variant?: "success" | "error" | "info" | "warning";
}

const InfoModal = ({
  isOpen,
  onClose,
  title,
  text,
  icon,
  confirmButtonText = "OK",
  confirmButtonColorClass,
  variant,
}: InfoModalProps) => {
  if (!isOpen) return null;

  // Determine button color class based on variant if not provided
  let buttonColorClass = confirmButtonColorClass;
  if (!buttonColorClass && variant) {
    switch (variant) {
      case "success":
        buttonColorClass = "bg-green-200 hover:bg-green-100";
        break;
      case "error":
        buttonColorClass = "bg-red-200 hover:bg-red-100";
        break;
      case "info":
        buttonColorClass = "bg-blue-200 hover:bg-blue-100";
        break;
      case "warning":
        buttonColorClass = "bg-yellow-200 hover:bg-yellow-100";
        break;
      default:
        buttonColorClass = "bg-green-200 hover:bg-green-100";
    }
  } else if (!buttonColorClass) {
    buttonColorClass = "bg-green-200 hover:bg-green-100";
  }

  // Default icons based on variant
  let defaultIcon: ReactNode;
  switch (variant) {
    case "success":
      defaultIcon = (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-400">
          <svg
            className="h-6 w-6 text-green-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
      break;
    case "error":
      defaultIcon = (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-400">
          <svg
            className="h-6 w-6 text-red-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
      break;
    case "info":
      defaultIcon = (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg
            className="h-6 w-6 text-blue-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
      break;
    case "warning":
      defaultIcon = (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
          <svg
            className="h-6 w-6 text-yellow-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      );
      break;
    default:
      defaultIcon = null;
  }

  const displayIcon = icon || defaultIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          {displayIcon && <div className="mb-4">{displayIcon}</div>}
          <h3 className="text-lg font-medium text-dark dark:text-light mb-2">
            {title}
          </h3>
          <p className=" text-dark dark:text-light">{text}</p>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorClass}`}
            onClick={onClose}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
