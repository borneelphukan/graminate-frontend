import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface WidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedWidgets: string[]) => void;
  initialSelectedWidgets: string[];
}

const AVAILABLE_WIDGETS = [
  { id: "Task Calendar", name: "Task Calendar" },
  { id: "Trend Graph", name: "Financial Trend Graph - Sales Widget" },
  { id: "Compare Graph", name: "Financial Compare Graph - Sales Widget" },
  { id: "Poultry Task Manager", name: "Task Manager - Poultry Widget" },
  { id: "Apiculture Task Manager", name: "Task Manager - Apiculture" },
  { id: "Apiculture Inventory Stock", name: "Inventory Stock (Apiculture)" },
  { id: "Poultry Inventory Stock", name: "Inventory Stock (Poultry)" },
];

const WidgetModal = ({
  isOpen,
  onClose,
  onSave,
  initialSelectedWidgets,
}: WidgetModalProps) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(
    initialSelectedWidgets
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedWidgets(initialSelectedWidgets);
    }
  }, [isOpen, initialSelectedWidgets]);

  const handleCheckboxChange = (widgetId: string, isChecked: boolean) => {
    setSelectedWidgets((prev) => {
      if (isChecked) {
        return [...prev, widgetId];
      } else {
        return prev.filter((id) => id !== widgetId);
      }
    });
  };

  const handleSaveClick = () => {
    onSave(selectedWidgets);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Dashboard Widgets
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4 my-6">
          {AVAILABLE_WIDGETS.map((widget) => (
            <Checkbox
              key={widget.id}
              id={`widget-${widget.id}`}
              label={widget.name}
              checked={selectedWidgets.includes(widget.id)}
              onChange={(e) =>
                handleCheckboxChange(
                  widget.id,
                  typeof e === "boolean"
                    ? e
                    : e.target
                    ? e.target.checked
                    : false
                )
              }
            />
          ))}
        </div>
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button text="Cancel" style="secondary" onClick={onClose} />
          <Button
            text="Save Changes"
            style="primary"
            onClick={handleSaveClick}
          />
        </div>
      </div>
    </div>
  );
};

export default WidgetModal;
