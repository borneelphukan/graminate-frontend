import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

type Props = {
  value: string;
  placeholder?: string;
  mode?: "table" | "type";
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const SearchBar: React.FC<Props> = ({
  value,
  placeholder = "",
  mode = "",
  onChange,
}) => {
  if (mode === "table" && !placeholder) {
    throw new Error(
      "The 'placeholder' parameter is mandatory when 'mode' is set to 'table'."
    );
  }

  if (mode === "type" && !placeholder) {
    placeholder = "Search";
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className="w-full px-4 py-1 border border-gray-300 dark:border-gray-200 focus:border-green-200 
                   rounded-md dark:bg-gray-700 focus:outline-none 
                   text-dark dark:text-light placeholder-gray-300 dark:placeholder-gray-500"
        onChange={onChange}
      />
      <button
        className="absolute inset-y-0 right-4 flex items-center"
        aria-label="Search"
      >
        <FontAwesomeIcon
          icon={faSearch}
          className="size-5 stroke-gray-800 dark:stroke-white"
        />
      </button>
    </div>
  );
};

export default SearchBar;
