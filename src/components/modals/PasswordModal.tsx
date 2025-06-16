import { faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactNode } from "react";

type PasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title?: string;
  children: ReactNode;
  footerContent?: ReactNode;
};

const PasswordModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  footerContent,
}: PasswordModalProps) => {
  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="bg-light dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={handleContentClick}
      >
        {title && (
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-300 dark:border-gray-600">
            <h3 className="text-xl font-semibold text-dark dark:text-light">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-dark dark:text-light hover:text-gray-300 dark:hover:text-gray-300 px-1.5 py-0.5 hover:bg-gray-500 dark:hover:bg-gray-700 rounded-full "
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faClose} />
            </button>
          </div>
        )}

        <div className="mb-6 text-dark dark:text-light">{children}</div>

        {footerContent && (
          <div className="flex justify-end space-x-3">{footerContent}</div>
        )}
      </form>
    </div>
  );
};

export default PasswordModal;
