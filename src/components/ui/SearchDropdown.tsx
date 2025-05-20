import { useState } from "react";
import SearchBar from "./SearchBar";

type Props = {
  items: { label: string; view: string }[];
  navigateTo: (view: string) => void;
};

const SearchDropdown = ({ items, navigateTo }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items based on search query
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute left-0 mt-5 bg-white dark:bg-dark border border-gray-300 dark:border-gray-200 rounded-md shadow-sm w-96 h-48 z-10 overflow-hidden">
      {/* Search Bar */}
      <div className="bg-light dark:bg-dark py-1">
        <div className="mx-3 my-1">
          <SearchBar
            mode="type"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filtered Items List */}
      <ul className="overflow-y-auto h-[calc(100%-3rem)] pb-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <li key={item.view}>
              <button
                className="w-full text-sm text-dark dark:text-light text-left px-4 py-2 hover:bg-gray-500 dark:bg-gray-900 dark:hover:bg-gray-700"
                onClick={() => navigateTo(item.view)}
              >
                {item.label}
              </button>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-300 py-2">No items found</li>
        )}
      </ul>
    </div>
  );
};

export default SearchDropdown;
