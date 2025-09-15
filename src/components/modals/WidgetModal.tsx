import React, { useState, useEffect, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faGrip,
  faDollar,
  faKiwiBird,
  faCow,
  faFish,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import BeeIcon from "../../../public/icon/BeeIcon";

interface WidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedWidgets: string[]) => void;
  initialSelectedWidgets: string[];
  userSubTypes: string[];
}

const ALL_AVAILABLE_WIDGETS = [
  { id: "Task Calendar", name: "Task Calendar", requiredSubType: null },
  { id: "Trend Graph", name: "Financial Trend Graph", requiredSubType: null },
  {
    id: "Compare Graph",
    name: "Financial Compare Graph",
    requiredSubType: null,
  },
  {
    id: "Poultry Task Manager",
    name: "Poultry Task Manager",
    requiredSubType: "Poultry",
  },
  {
    id: "Poultry Inventory Stock",
    name: "Poultry Inventory",
    requiredSubType: "Poultry",
  },
  {
    id: "Apiculture Task Manager",
    name: "Apiculture Task Manager",
    requiredSubType: "Apiculture",
  },
  {
    id: "Apiculture Inventory Stock",
    name: "Apiculture Inventory",
    requiredSubType: "Apiculture",
  },
  {
    id: "Cattle Rearing Task Manager",
    name: "Cattle Rearing Task Manager",
    requiredSubType: "Cattle Rearing",
  },
  {
    id: "Cattle Rearing Inventory Stock",
    name: "Cattle Rearing Inventory",
    requiredSubType: "Cattle Rearing",
  },
  {
    id: "Fishery Task Manager",
    name: "Fishery Task Manager",
    requiredSubType: "Fishery",
  },
  {
    id: "Fishery Inventory Stock",
    name: "Fishery Inventory",
    requiredSubType: "Fishery",
  },
];

const WidgetModal = ({
  isOpen,
  onClose,
  onSave,
  initialSelectedWidgets,
  userSubTypes,
}: WidgetModalProps) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(
    initialSelectedWidgets
  );
  const modalRef = useRef<HTMLDivElement>(null);

  const availableWidgets = useMemo(() => {
    return ALL_AVAILABLE_WIDGETS.filter((widget) => {
      if (!widget.requiredSubType) return true;
      return userSubTypes.includes(widget.requiredSubType);
    });
  }, [userSubTypes]);

  const categorizedWidgets = useMemo(() => {
    const groups: Record<string, typeof availableWidgets> = {};
    const financialWidgetIds = ["Trend Graph", "Compare Graph"];
    for (const widget of availableWidgets) {
      let category: string;
      if (financialWidgetIds.includes(widget.id)) {
        category = "Financial";
      } else {
        category = widget.requiredSubType || "General";
      }
      if (!groups[category]) groups[category] = [];
      groups[category].push(widget);
    }
    const categoryOrder = [
      "General",
      "Financial",
      "Poultry",
      "Cattle Rearing",
      "Apiculture",
      "Fishery",
    ];
    const orderedGroups: Record<string, typeof availableWidgets> = {};
    for (const categoryName of categoryOrder) {
      if (groups[categoryName]) {
        orderedGroups[categoryName] = groups[categoryName];
      }
    }
    return orderedGroups;
  }, [availableWidgets]);

  const categoryIcons: Record<string, IconDefinition | React.ElementType> = {
    General: faGrip,
    Financial: faDollar,
    Poultry: faKiwiBird,
    "Cattle Rearing": faCow,
    Apiculture: BeeIcon,
    Fishery: faFish,
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedWidgets(initialSelectedWidgets);
    }
  }, [isOpen, initialSelectedWidgets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 w-full max-w-4xl p-6 rounded-lg shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Dashboard Widgets
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-400 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 py-4 my-2">
          {Object.entries(categorizedWidgets).map(
            ([category, widgetsInCategory]) => {
              const icon = categoryIcons[category];
              return (
                <div
                  key={category}
                  className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 text-green-200 flex items-center justify-center">
                      {typeof icon === "object" && "prefix" in icon ? (
                        <FontAwesomeIcon
                          icon={icon}
                          className="h-full w-full"
                        />
                      ) : (
                        React.createElement(icon)
                      )}
                    </div>
                    <h4 className="font-semibold text-dark dark:text-light">
                      {category}
                    </h4>
                  </div>
                  <div className="mt-4 h-28 grid grid-rows-3 grid-flow-col auto-cols-max gap-x-8 gap-y-3">
                    {widgetsInCategory.map((widget) => (
                      <div key={widget.id} className="flex items-center">
                        <Checkbox
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-400 dark:border-gray-700">
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
