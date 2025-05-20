import React from "react";

type Props = {
  placeholder?: string;
  value: string;
  rows?: number;
  onInput: (value: string) => void;
  onBlur?: () => void;
};

const CustomTextArea = ({
  placeholder = "Add a description...",
  value,
  rows = 4,
  onInput,
  onBlur,
}: Props) => {
  return (
    <textarea
      className="w-full border border-gray-300 p-3 text-sm rounded shadow-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-light"
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onInput(e.target.value)}
      onBlur={onBlur}
    />
  );
};

export default CustomTextArea;
