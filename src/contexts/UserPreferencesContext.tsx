import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { SupportedLanguage } from "@/translations";

export type TimeFormatOption = "12-hour" | "24-hour";
export type TemperatureScaleOption = "Celsius" | "Fahrenheit";

interface UserPreferencesContextType {
  timeFormat: TimeFormatOption;
  setTimeFormat: (format: TimeFormatOption) => void;
  temperatureScale: TemperatureScaleOption;
  setTemperatureScale: (scale: TemperatureScaleOption) => void;
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export const UserPreferencesProvider = ({children}: {
  children: ReactNode;
}) => {
  const [timeFormat, setTimeFormatState] = useState<TimeFormatOption>(() => {
    if (typeof window !== "undefined") {
      const storedFormat = localStorage.getItem(
        "timeFormat"
      ) as TimeFormatOption;
      if (storedFormat === "12-hour" || storedFormat === "24-hour") {
        return storedFormat;
      }
    }
    return "24-hour";
  });

  const [temperatureScale, setTemperatureScaleState] =
    useState<TemperatureScaleOption>(() => {
      if (typeof window !== "undefined") {
        const storedScale = localStorage.getItem(
          "temperatureScale"
        ) as TemperatureScaleOption;
        if (storedScale === "Celsius" || storedScale === "Fahrenheit") {
          return storedScale;
        }
      }
      return "Celsius";
    });

  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const storedLanguage = localStorage.getItem(
        "language"
      ) as SupportedLanguage;
      if (
        storedLanguage &&
        (storedLanguage === "English" ||
          storedLanguage === "Hindi" ||
          storedLanguage === "Assamese")
      ) {
        return storedLanguage;
      }
    }
    return "English";
  });

  const setTimeFormatContext = (format: TimeFormatOption) => {
    setTimeFormatState(format);
    if (typeof window !== "undefined") {
      localStorage.setItem("timeFormat", format);
    }
  };

  // Temperature scale (Celsius or Fahrenheit) - weather settings
  const setTemperatureScaleContext = (scale: TemperatureScaleOption) => {
    setTemperatureScaleState(scale);
    if (typeof window !== "undefined") {
      localStorage.setItem("temperatureScale", scale);
    }
  };

  // Language preference (English, Hindi, Assamese) - General settings
  const setLanguageContext = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  };

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "timeFormat" && event.newValue) {
        if (event.newValue === "12-hour" || event.newValue === "24-hour") {
          setTimeFormatState(event.newValue as TimeFormatOption);
        }
      }
      if (event.key === "temperatureScale" && event.newValue) {
        if (event.newValue === "Celsius" || event.newValue === "Fahrenheit") {
          setTemperatureScaleState(event.newValue as TemperatureScaleOption);
        }
      }
      if (event.key === "language" && event.newValue) {
        if (
          event.newValue === "English" ||
          event.newValue === "Hindi" ||
          event.newValue === "Assamese"
        ) {
          setLanguageState(event.newValue as SupportedLanguage);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);

      const initialStoredTimeFormat = localStorage.getItem(
        "timeFormat"
      ) as TimeFormatOption;
      if (
        initialStoredTimeFormat &&
        (initialStoredTimeFormat === "12-hour" ||
          initialStoredTimeFormat === "24-hour") &&
        initialStoredTimeFormat !== timeFormat
      ) {
        setTimeFormatState(initialStoredTimeFormat);
      }

      const initialStoredTempScale = localStorage.getItem(
        "temperatureScale"
      ) as TemperatureScaleOption;
      if (
        initialStoredTempScale &&
        (initialStoredTempScale === "Celsius" ||
          initialStoredTempScale === "Fahrenheit") &&
        initialStoredTempScale !== temperatureScale
      ) {
        setTemperatureScaleState(initialStoredTempScale);
      }

      const initialStoredLanguage = localStorage.getItem(
        "language"
      ) as SupportedLanguage;
      if (
        initialStoredLanguage &&
        (initialStoredLanguage === "English" ||
          initialStoredLanguage === "Hindi" ||
          initialStoredLanguage === "Assamese") &&
        initialStoredLanguage !== language
      ) {
        setLanguageState(initialStoredLanguage);
      }

      return () => {
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, [timeFormat, temperatureScale, language]);

  return (
    <UserPreferencesContext.Provider
      value={{
        timeFormat,
        setTimeFormat: setTimeFormatContext,
        temperatureScale,
        setTemperatureScale: setTemperatureScaleContext,
        language,
        setLanguage: setLanguageContext,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return context;
};
