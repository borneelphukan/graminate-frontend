import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import Switch from "react-switch";

const ThemeSwitch = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    document.documentElement.classList.add("transition", "duration-1000");
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    setTimeout(() => {
      document.documentElement.classList.remove("transition", "duration-1000");
    }, 1000);
  };

  return (
    <Switch
      onChange={toggleTheme}
      checked={isDark}
      checkedIcon={
        <div className="flex items-center justify-center w-full h-full bg-dark text-light rounded-full">
          <FontAwesomeIcon icon={faMoon} className="text-light" />
        </div>
      }
      uncheckedIcon={
        <div className="flex items-center justify-center w-full h-full text-dark rounded-full">
          <FontAwesomeIcon icon={faSun} className="text-yellow-200" />
        </div>
      }
      height={30}
      width={64}
      handleDiameter={24}
      offColor="#ededed"
      onColor="#000000"
    />
  );
};

export default ThemeSwitch;
