import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import NotificationBar from "../NotificationSideBar";
import Image from "next/image";
import type { User } from "@/types/card-props";
import type { Navbar as NavbarType } from "@/types/card-props";
import axiosInstance from "@/lib/utils/axiosInstance";
import {
  faArrowUpRightFromSquare,
  faBars,
  faBell,
  faChevronDown,
  faChevronUp,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Task } from "@/types/types";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, TranslationKey } from "@/translations";

interface NavbarProps extends NavbarType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

interface Notification {
  titleKey: TranslationKey;
  description: string;
}

const Navbar = ({
  imageSrc = "/images/logo.png",
  userId,
  isSidebarOpen,
  toggleSidebar,
}: NavbarProps) => {
  const router = useRouter();
  const { language: currentLanguage } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    business: "",
    imageUrl: "",
  });
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [isNotificationBarOpen, setNotificationBarOpen] =
    useState<boolean>(false);

  const userNavigation = useMemo(
    () => [
      {
        nameKey: "pricing" as TranslationKey,
        href: `/platform/${userId}/pricing`,
        external: true,
      },
      {
        nameKey: "trainingAndServices" as TranslationKey,
        href: "/training-services",
        external: true,
      },
    ],
    [userId]
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasShownToday, setHasShownToday] = useState(false);

  const fetchTasksDueTomorrow = useCallback(async () => {
    try {
      if (!userId || hasShownToday) return;

      const response = await axiosInstance.get<{ tasks: Task[] }>(
        `/tasks/upcoming/${userId}?days=1`
      );

      const tasksDueTomorrow = response.data.tasks || [];

      if (tasksDueTomorrow.length > 0) {
        const tasksList = tasksDueTomorrow
          .map((task) => `• ${task.task || t("untitledTask")}`)
          .join("<br>");

        setNotifications([
          {
            titleKey: "tasksDueTomorrow",
            description: tasksList,
          },
        ]);
        setHasShownToday(true);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [userId, hasShownToday, t]);

  useEffect(() => {
    const lastShownDate = localStorage.getItem("lastNotificationDate");
    const today = new Date().toDateString();

    if (lastShownDate !== today) {
      fetchTasksDueTomorrow();
      localStorage.setItem("lastNotificationDate", today);
    } else {
      setHasShownToday(true);
    }
  }, [fetchTasksDueTomorrow]);

  useEffect(() => {
    const lastShownDate = localStorage.getItem("lastNotificationDate");
    const today = new Date().toDateString();

    if (lastShownDate !== today) {
      fetchTasksDueTomorrow();
      localStorage.setItem("lastNotificationDate", today);
    } else {
      setHasShownToday(true);
    }
  }, [userId, t, hasShownToday, fetchTasksDueTomorrow]);

  useEffect(() => {
    const lastShownDate = localStorage.getItem("lastNotificationDate");
    const today = new Date().toDateString();

    if (lastShownDate !== today) {
      fetchTasksDueTomorrow();
      localStorage.setItem("lastNotificationDate", today);
    } else {
      setHasShownToday(true);
    }
  }, [userId, fetchTasksDueTomorrow]);

  const clearAllNotifications = () => {
    setNotifications([]);
    setHasShownToday(true);
  };

  const notificationCount = notifications.length;

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const response = await axiosInstance.get(`/user/${userId}`);
        const data = response.data?.data?.user;

        setUser({
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          business: data.business_name,
          imageUrl:
            data.profile_picture ||
            `https://eu.ui-avatars.com/api/?name=${encodeURIComponent(
              data.first_name
            )}+${encodeURIComponent(data.last_name)}&size=250`,
        });
      } catch (error: unknown) {
        console.error(
          "Error fetching user details:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    if (userId) fetchUserDetails();
  }, [userId]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("chatMessages");
      localStorage.removeItem("token");
      localStorage.removeItem("language");
      localStorage.removeItem("timeFormat");
      localStorage.removeItem("temperatureScale");
      router.push("/");
    } catch (error: unknown) {
      console.error(
        "Error during logout:",
        error instanceof Error ? error.message : "Logout failed"
      );
    }
  };

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);
  const toggleNotificationBar = () =>
    setNotificationBarOpen(!isNotificationBarOpen);

  const toUserPreferences = () => {
    router.push(`/platform/${userId}/settings/general`);
  };

  return (
    <>
      <header className="px-6 lg:px-12 bg-gray-800 py-2 w-full top-0 z-50">
        <div className="mx-auto w-full px-2 sm:px-4 lg:divide-y lg:divide-gray-700 lg:px-8">
          <div className="relative flex h-12 py-1 justify-between">
            <div className="relative z-10 flex px-2 lg:px-0">
              <div className="flex flex-shrink-0 items-center">
                <div className="flex flex-row items-center gap-4">
                  <button
                    className="lg:hidden text-gray-400 hover:text-white focus:outline-none mr-2"
                    onClick={toggleSidebar}
                    aria-label={t("toggleSidebar")}
                    aria-expanded={isSidebarOpen}
                  >
                    <FontAwesomeIcon icon={faBars} className="size-6" />
                  </button>
                  <Image
                    src={imageSrc}
                    alt="Graminate Logo"
                    className="h-10 w-auto"
                    width={100}
                    height={40}
                    priority
                  />
                  <span className="hidden sm:inline text-bold text-3xl text-light">
                    {t("graminate")}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative z-10 ml-4 flex items-center">
              <div className="flex items-center space-x-3 pr-4 border-r border-gray-700">
                <button
                  aria-label={t("settings")}
                  className="text-gray-400 hover:bg-blue-100 p-2 rounded-md focus:outline-none"
                  onClick={toUserPreferences}
                >
                  <FontAwesomeIcon icon={faGear} className="size-6" />
                </button>
                <button
                  className="relative text-gray-400 hover:bg-blue-100 p-2 rounded-md focus:outline-none"
                  onClick={toggleNotificationBar}
                  aria-label={t("notifications")}
                >
                  <FontAwesomeIcon icon={faBell} className="size-6" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-0 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </div>
              <div className="relative ml-4 gap-2 flex-shrink-0 flex items-center">
                <button
                  className="relative rounded-full bg-gray-800 text-sm text-white hidden lg:flex"
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                >
                  {user.imageUrl && (
                    <Image
                      className="h-7 w-7 rounded-full"
                      src={user.imageUrl}
                      alt={user.name || "User"}
                      width={28}
                      height={28}
                    />
                  )}
                </button>
                <span className="ml-2 text-white text-sm font-medium hidden lg:inline">
                  {user.name}
                </span>
                <button
                  className="ml-1 flex items-center text-gray-400 hover:text-white focus:outline-none"
                  onClick={toggleDropdown}
                >
                  <FontAwesomeIcon
                    icon={isDropdownOpen ? faChevronUp : faChevronDown}
                    className="size-5 transition-transform duration-200 ease-in-out"
                  />
                </button>
                {isDropdownOpen && (
                  <div className="origin-top-right absolute right-0 top-12 w-96 rounded-md shadow-lg py-4 bg-white dark:bg-gray-700">
                    <div className="px-4 pb-3 border-b border-gray-500 dark:border-gray-300">
                      <div className="flex items-center">
                        {user.imageUrl && (
                          <Image
                            className="h-12 w-12 rounded-full"
                            src={user.imageUrl}
                            alt={user.name || "User"}
                            width={48}
                            height={48}
                          />
                        )}
                        <div className="ml-3 flex-1 flex-col gap-1">
                          <p className="text-lg font-semibold text-dark dark:text-light">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-300">{user.email}</p>
                          {user.business && (
                            <p className="text-sm text-gray-100 dark:text-white">
                              {user.business}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <a
                              href={`/platform/${userId}/settings/general`}
                              className="text-sm font-medium text-green-600 hover:underline"
                            >
                              {t("profilePreferences")}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      {userNavigation.map((item) => (
                        <a
                          key={item.nameKey}
                          href={item.href}
                          className="flex items-center mb-2 text-sm font-medium text-gray-200 dark:text-gray-500 hover:underline"
                          target={item.external ? "_blank" : "_self"}
                        >
                          {t(item.nameKey)}
                          {item.external && (
                            <FontAwesomeIcon
                              icon={faArrowUpRightFromSquare}
                              className="size-3 text-dark dark:text-light ml-1"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm text-dark dark:text-light border-t border-gray-500 dark:border-gray-300">
                      <button
                        className="text-sm font-medium text-dark dark:text-light hover:underline"
                        onClick={handleLogout}
                      >
                        {t("signOut")}
                      </button>
                      <a href="/privacy-policy" className="hover:underline">
                        {t("privacyPolicy")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <NotificationBar
        userId={userId}
        notifications={notifications.map((n) => ({
          ...n,
          title: t(n.titleKey),
        }))}
        isOpen={isNotificationBarOpen}
        closeNotificationBar={toggleNotificationBar}
        onClearAll={clearAllNotifications}
      />
    </>
  );
};

export default Navbar;
