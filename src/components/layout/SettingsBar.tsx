import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, translations } from "@/translations";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";

type SettingsSubItem = {
  label: string;
  href: string;
};

type SettingsMainItem = {
  label: string;
  href?: string;
  subItems?: SettingsSubItem[];
};

type GeneralTranslationKeys = keyof typeof translations.English;

const SettingsBar = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;

  const { language: currentLanguage } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [userType, setUserType] = useState<string | null>(null);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoadingUserDetails(false);
      return;
    }
    setIsLoadingUserDetails(true);
    const fetchUserDetails = async () => {
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const userData = response.data.user ?? response.data.data?.user;
        if (userData) {
          setUserType(userData.type || "Producer");
          const rawSubTypes = userData.sub_type;
          const parsedSubTypes = Array.isArray(rawSubTypes)
            ? rawSubTypes
            : typeof rawSubTypes === "string"
            ? rawSubTypes.replace(/[{}"]/g, "").split(",").filter(Boolean)
            : [];
          setSubTypes(parsedSubTypes);
        } else {
          setUserType("Producer");
          setSubTypes([]);
        }
      } catch (error) {
        console.error("SettingsBar: Error fetching user details:", error);
        setUserType("Producer");
        setSubTypes([]);
      } finally {
        setIsLoadingUserDetails(false);
      }
    };
    fetchUserDetails();
  }, [userId]);

  const settingsMenu = useMemo((): SettingsMainItem[] => {
    const yourPreferenceSubItems: SettingsSubItem[] = [];

    yourPreferenceSubItems.push({
      label: t("general" as GeneralTranslationKeys),
      href: `/platform/${userId}/settings/general/`,
    });

    if (!isLoadingUserDetails) {
      if (userType === "Producer") {
        yourPreferenceSubItems.push({
          label: t("weather" as GeneralTranslationKeys),
          href: `/platform/${userId}/settings/weather_settings`,
        });
        if (subTypes.includes("Poultry")) {
          yourPreferenceSubItems.push({
            label: t("poultry" as GeneralTranslationKeys),
            href: `/platform/${userId}/settings/poultry_settings`,
          });
        }
        if (subTypes.includes("Fishery")) {
          yourPreferenceSubItems.push({
            label: t("fishery" as GeneralTranslationKeys),
            href: `/platform/${userId}/settings/fishery_settings`,
          });
        }
        if (subTypes.includes("Cattle Rearing")) {
          yourPreferenceSubItems.push({
            label: t("cattleRearing" as GeneralTranslationKeys),
            href: `/platform/${userId}/settings/cattle_rearing_settings`,
          });
        }
      }
    }

    yourPreferenceSubItems.push({
      label: t("notifications" as GeneralTranslationKeys),
      href: `/platform/${userId}/settings/notifications`,
    });

    return [
      {
        label: t("yourPreferences" as GeneralTranslationKeys),
        subItems: yourPreferenceSubItems,
      },
      {
        label: t("account" as GeneralTranslationKeys),
        subItems: [
          {
            label: t("accountSettings" as GeneralTranslationKeys),
            href: `/platform/${userId}/settings/account`,
          },
        ],
      },
    ];
  }, [userId, t, userType, subTypes, isLoadingUserDetails]);

  const currentPath = router.pathname;

  return (
    <div className="w-72 px-4 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-light border-r border-gray-400 dark:border-gray-200 min-h-screen -m-6">
      <div className="flex items-center pt-4">
        <Button
          text={t("settingsBarBack" as GeneralTranslationKeys)}
          style="ghost"
          arrow="left"
          onClick={() => router.back()}
        />
      </div>
      <div className="px-4 py-2 text-xl font-semibold">
        {t("settingsBarHeader" as GeneralTranslationKeys)}
      </div>
      <div className="px-4">
        {isLoadingUserDetails && !userType && !subTypes.length && (
          <div className="flex justify-center py-4">
            <Loader />
          </div>
        )}
        {settingsMenu.map((menu, index) => (
          <div key={index} className="mt-4">
            {menu.subItems ? (
              <>
                <div className="text-medium font-semibold text-gray-600 dark:text-light">
                  {menu.label}
                </div>
                <ul className="mt-2 space-y-1">
                  {menu.subItems.map((subItem, subIndex) => {
                    // Active state logic:
                    // For /general/, it's active if currentPath is /general/ AND (no view query OR view=profile for NavPanel)
                    // For other pages, direct pathname match.
                    let isActive = false;
                    if (
                      subItem.href === `/platform/${userId}/settings/general/`
                    ) {
                      isActive =
                        currentPath === subItem.href &&
                        (!router.query.view || router.query.view === "profile");
                    } else {
                      isActive = currentPath === subItem.href;
                    }

                    const activeClass = isActive
                      ? "bg-sky-100 dark:bg-sky-700 text-sky-700 dark:text-sky-300 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-700";
                    return (
                      <li key={subIndex}>
                        <Link
                          href={subItem.href || "#"}
                          passHref
                          legacyBehavior
                        >
                          <a
                            className={`block px-2 py-1.5 text-sm rounded ${activeClass}`}
                          >
                            {subItem.label}
                          </a>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <Link href={menu.href || "#"} passHref legacyBehavior>
                <a className="block px-2 py-1.5 text-sm font-medium text-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300">
                  {menu.label}
                </a>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default SettingsBar;
