import React, { useState } from "react";
import Button from "../ui/Button";
import TextField from "../ui/TextField";

type TicketModalProps = {
  isOpen: boolean;
  columnName: string;
  currentLimit: string;
  onSave: (limit: string) => void;
  onCancel: () => void;
};

const TicketModal = ({
  isOpen,
  currentLimit = "No limit set",
  onSave,
  onCancel,
}: TicketModalProps) => {
  const [newLimit, setNewLimit] = useState("");

  const handleSave = () => {
    onSave(newLimit.trim() || currentLimit);
  };

  const clearLimit = () => {
    setNewLimit("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-50"
      aria-labelledby="modal-title"
      aria-hidden="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-96">
        <div className="p-6">
          <h2
            id="modal-title"
            className="text-lg font-bold text-gray-800 dark:text-light"
          >
            Column limit
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Set a limit to the number of tasks that can be added to this column.
          </p>

          <div className="mt-4 flex flex-1 flex-row items-center gap-1">
            <TextField
              label="Maximum tasks"
              placeholder="Set Limit"
              width="medium"
              value={newLimit}
              onChange={(val) => setNewLimit(val)}
            />

            {newLimit.trim() && (
              <div className="mt-6">
                <Button
                  text="Reset"
                  width="large"
                  style="ghost"
                  onClick={clearLimit}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 dark:bg-gray-800 flex justify-end gap-3">
          <Button
            text="Cancel"
            width="medium"
            style="ghost"
            onClick={onCancel}
          />
          <Button
            text="Save"
            width="medium"
            style="primary"
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
