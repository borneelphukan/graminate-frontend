import { useState } from "react";
import type { NavPanel } from "@/types/card-props";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const NavPanel = ({ buttons, activeView, onNavigate }: NavPanel) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* Desktop Navigation */}
      <div className="hidden md:flex">
        {buttons.map(({ name, view }) => (
          <button
            key={view}
            className={`flex-1 px-4 py-2 text-center text-sm font-medium
               dark:border-gray-200 hover:bg-gray-500 dark:hover:bg-gray-700 bg-neutral-100 dark:bg-gray-600 dark:text-light focus:outline-none shadow-md
              ${
                activeView === view
                  ? "border-b-transparent bg-white font-semibold"
                  : "text-gray-600 font-thin"
              }`}
            onClick={() => onNavigate(view)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Mobile Navigation (Hamburger Menu) */}
      <div className="flex md:hidden justify-center">
        <div className="flex flex-col items-center w-full relative">
          {/* Hamburger Icon */}
          <button
            className="p-2 rounded-md focus:outline-none text-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open menu"
          >
            <FontAwesomeIcon icon={faBars} className="size-6" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 z-50 w-full bg-white text-gray-100 shadow-md">
              {buttons.map(({ name, view }) => (
                <button
                  key={view}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-200"
                  onClick={() => {
                    onNavigate(view);
                    setIsMenuOpen(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavPanel;
