import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Switch from "react-switch";

type ThemeSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ThemeSwitch = ({ checked, onChange }: ThemeSwitchProps) => {
  const handleToggle = () => {
    onChange(!checked);
  };

  return (
    <Switch
      onChange={handleToggle}
      checked={checked}
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
