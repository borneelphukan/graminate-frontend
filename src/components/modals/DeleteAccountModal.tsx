import { faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactNode } from "react";

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onHeaderClose?: () => void;
  title?: string;
  children: ReactNode;
  footerContent?: ReactNode;
};

const DeleteAccountModal = ({
  isOpen,
  onClose,

  title,
  children,
  footerContent,
}: DeleteAccountModalProps) => {
  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-light dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={handleContentClick}
      >
        {title && (
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-300 dark:border-gray-600">
            <h3 className="text-xl font-semibold text-dark dark:text-light">
              {title}
            </h3>
            <button
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
      </div>
    </div>
  );
};

export default DeleteAccountModal;
