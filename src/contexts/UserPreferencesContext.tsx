import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { SupportedLanguage } from "@/translations";
import axiosInstance from "@/lib/utils/axiosInstance";

export type TimeFormatOption = "12-hour" | "24-hour";
export type TemperatureScaleOption = "Celsius" | "Fahrenheit";

type UserPreferencesContextType = {
  timeFormat: TimeFormatOption;
  setTimeFormat: (format: TimeFormatOption) => void;
  temperatureScale: TemperatureScaleOption;
  setTemperatureScale: (scale: TemperatureScaleOption) => void;
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  isFirstLogin: boolean;
  setIsFirstLogin: (isFirst: boolean) => void;
  userType: string | null;
  subTypes: string[];
  isSubTypesLoading: boolean;
  fetchUserSubTypes: (userId: string | number) => Promise<void>;
  setUserSubTypes: (subTypes: string[]) => void;
  widgets: string[];
  setWidgets: (widgets: string[]) => void;
  updateUserWidgets: (
    userId: string | number,
    widgets: string[]
  ) => Promise<void>;
};

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export const UserPreferencesProvider = ({
  children,
}: {
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

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const storedDarkMode = localStorage.getItem("darkMode");
      return storedDarkMode === "true";
    }
    return false;
  });

  const [isFirstLogin, setIsFirstLoginState] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [subTypes, setSubTypesState] = useState<string[]>([]);
  const [widgets, setWidgetsState] = useState<string[]>([]);
  const [isSubTypesLoading, setIsSubTypesLoading] = useState(true);

  const setTimeFormatContext = useCallback((format: TimeFormatOption) => {
    setTimeFormatState(format);
    if (typeof window !== "undefined") {
      localStorage.setItem("timeFormat", format);
    }
  }, []);

  const setTemperatureScaleContext = useCallback(
    (scale: TemperatureScaleOption) => {
      setTemperatureScaleState(scale);
      if (typeof window !== "undefined") {
        localStorage.setItem("temperatureScale", scale);
      }
    },
    []
  );

  const setLanguageContext = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  }, []);

  const setDarkModeContext = useCallback((enabled: boolean) => {
    setDarkModeState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", String(enabled));
    }
  }, []);

  const setIsFirstLogin = useCallback((isFirst: boolean) => {
    setIsFirstLoginState(isFirst);
  }, []);

  const setUserSubTypes = useCallback((newSubTypes: string[]) => {
    setSubTypesState(newSubTypes);
  }, []);

  const setWidgets = useCallback((newWidgets: string[]) => {
    setWidgetsState(newWidgets);
  }, []);

  const updateUserWidgets = useCallback(
    async (userId: string | number, newWidgets: string[]) => {
      try {
        await axiosInstance.put(`/user/${userId}`, { widgets: newWidgets });
        setWidgets(newWidgets);
      } catch (error) {
        console.error("Failed to update user widgets:", error);
        throw error;
      }
    },
    [setWidgets]
  );

  const fetchUserSubTypes = useCallback(async (userId: string | number) => {
    setIsSubTypesLoading(true);
    try {
      const response = await axiosInstance.get(`/user/${userId}`);
      const user = response.data?.data?.user ?? response.data?.user;
      if (!user) throw new Error("User payload missing");

      setIsFirstLoginState(!user.business_name);
      setUserType(user.type || "Producer");
      setSubTypesState(Array.isArray(user.sub_type) ? user.sub_type : []);
      setWidgetsState(Array.isArray(user.widgets) ? user.widgets : []);
    } catch (err) {
      console.error("Error fetching user sub_types:", err);
      setIsFirstLoginState(true);
      setUserType("Producer");
      setSubTypesState([]);
      setWidgetsState([]);
    } finally {
      setIsSubTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [darkMode]);

  return (
    <UserPreferencesContext.Provider
      value={{
        timeFormat,
        setTimeFormat: setTimeFormatContext,
        temperatureScale,
        setTemperatureScale: setTemperatureScaleContext,
        language,
        setLanguage: setLanguageContext,
        darkMode,
        setDarkMode: setDarkModeContext,
        isFirstLogin,
        setIsFirstLogin,
        userType,
        subTypes,
        isSubTypesLoading,
        fetchUserSubTypes,
        setUserSubTypes,
        widgets,
        setWidgets,
        updateUserWidgets,
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

export type { SupportedLanguage };
