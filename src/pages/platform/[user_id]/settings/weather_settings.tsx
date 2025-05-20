import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import SettingsBar from "@/components/layout/SettingsBar";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import axios from "axios";
import {
  useUserPreferences,
  TemperatureScaleOption,
} from "@/contexts/UserPreferencesContext";
import { getTranslator, translations } from "@/translations";

type TranslationKey = keyof typeof translations.English;

const WeatherSettingsPage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;

  const {
    language: currentLanguage,
    temperatureScale: contextTemperatureScale,
    setTemperatureScale: setContextTemperatureScale,
  } = useUserPreferences();

  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [isLoading, setIsLoading] = useState(true);
  const [weatherSettings, setWeatherSettings] = useState<{
    location: string;
    scale: TemperatureScaleOption;
    aiSuggestions: boolean;
  }>({
    location: "",
    scale: "Celsius",
    aiSuggestions: false,
  });

  const [isSavingWeather, setIsSavingWeather] = useState(false);
  const [weatherSuccessMessage, setWeatherSuccessMessage] = useState("");
  const [weatherErrorMessage, setWeatherErrorMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setWeatherSettings((prev) => ({
        ...prev,
        scale: contextTemperatureScale || "Celsius",
      }));
      return;
    }
    setIsLoading(true);
    const fetchWeatherData = async () => {
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const userData = response.data.user ?? response.data.data?.user;
        if (userData) {
          const fetchedScale = (userData.temperature_scale ||
            contextTemperatureScale ||
            "Celsius") as TemperatureScaleOption;
          setWeatherSettings({
            location: userData.weather_location || "",
            scale: fetchedScale,
            aiSuggestions: userData.weather_ai_suggestions || false,
          });

          if (userData.temperature_scale)
            setContextTemperatureScale(fetchedScale);
          else if (contextTemperatureScale)
            setWeatherSettings((prev) => ({
              ...prev,
              scale: contextTemperatureScale,
            }));
        } else {
          setWeatherSettings((prev) => ({
            ...prev,
            scale: contextTemperatureScale || "Celsius",
          }));
        }
      } catch (error) {
        console.error("Error fetching user data for weather settings:", error);
        setWeatherSettings((prev) => ({
          ...prev,
          scale: contextTemperatureScale || "Celsius",
        }));
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeatherData();
  }, [userId, contextTemperatureScale, setContextTemperatureScale]);

  const handleSaveWeatherSettings = async () => {
    if (!userId) return;
    setIsSavingWeather(true);
    setWeatherSuccessMessage("");
    setWeatherErrorMessage("");
    try {
      await axiosInstance.put(`/user/${userId}`, {
        temperature_scale: weatherSettings.scale,
      });
      setContextTemperatureScale(weatherSettings.scale);
      setWeatherSuccessMessage(t("weatherUpdateSuccess" as TranslationKey));
    } catch (error: unknown) {
      let errorMessage = t("anUnknownErrorOccurred" as TranslationKey);
      if (axios.isAxiosError(error)) {
        const serverError =
          error.response?.data?.error || error.response?.data?.message;
        errorMessage = serverError || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setWeatherErrorMessage(
        `${t("weatherUpdateError" as TranslationKey)} ${errorMessage}`
      );
      console.error("Error updating weather settings:", errorMessage, error);
    } finally {
      setIsSavingWeather(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t("weatherSettings" as TranslationKey)}</title>
      </Head>
      <PlatformLayout>
        <div className="flex min-h-screen">
          <SettingsBar />
          <main className="flex-1 px-4 sm:px-6 md:px-12">
            <div className="py-6">
              <div className="pb-4 font-bold text-lg text-dark dark:text-light">
                {t("weatherSettings" as TranslationKey)}
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader />
                </div>
              ) : (
                <section>
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {t("weatherSettingsDescription" as TranslationKey)}
                      </p>
                      <Button text="Save Changes" style="primary" />
                    </div>

                    <div className="flex flex-col gap-4 max-w-lg">
                      <TextField
                        label={t("setLocation" as TranslationKey)}
                        placeholder={t("enterLocation" as TranslationKey)}
                        value={weatherSettings.location}
                        onChange={(val) =>
                          setWeatherSettings((prev) => ({
                            ...prev,
                            location: val,
                          }))
                        }
                        width="large"
                      />
                      <DropdownSmall
                        label={t("scale" as TranslationKey)}
                        items={["Celsius", "Fahrenheit"]}
                        selected={weatherSettings.scale}
                        onSelect={(val) =>
                          setWeatherSettings((prev) => ({
                            ...prev,
                            scale: val as TemperatureScaleOption,
                          }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="ai-suggestions"
                          checked={weatherSettings.aiSuggestions}
                          onChange={() =>
                            setWeatherSettings((prev) => ({
                              ...prev,
                              aiSuggestions: !prev.aiSuggestions,
                            }))
                          }
                          className="w-5 h-5 text-green-600 focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2"
                        />
                        <label
                          htmlFor="ai-suggestions"
                          className="text-sm dark:text-light"
                        >
                          {t("enableAISuggestions" as TranslationKey)}
                        </label>
                      </div>
                      <div className="mt-6">
                        <Button
                          style="primary"
                          text={t("saveWeatherSettings" as TranslationKey)}
                          onClick={handleSaveWeatherSettings}
                          isDisabled={isSavingWeather}
                        />
                      </div>
                      {weatherSuccessMessage && (
                        <p className="text-green-500 mt-2">
                          {weatherSuccessMessage}
                        </p>
                      )}
                      {weatherErrorMessage && (
                        <p className="text-red-500 mt-2">
                          {weatherErrorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </PlatformLayout>
    </>
  );
};

export default WeatherSettingsPage;
