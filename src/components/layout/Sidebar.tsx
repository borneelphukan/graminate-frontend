import React, { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUsers,
  faAddressBook,
  faCloud,
  faDollar,
  faWarehouse,
  faChevronRight,
  faChevronLeft,
  faFish,
  faKiwiBird,
  faCow,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

import type { Sidebar as SidebarProps } from "@/types/card-props";
import Loader from "../ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, TranslationKey } from "@/translations";

interface SidebarSection {
  icon: IconDefinition | React.ElementType;
  labelKey: TranslationKey;
  section: string;
  route?: string;
  basePath?: string;
  subItems: { labelKey: TranslationKey; route: string }[];
}

const Sidebar = ({ isOpen, userId, onSectionChange }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language: currentLanguage } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [userType, setUserType] = useState<string | null>(null);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [isUserTypeLoading, setIsUserTypeLoading] = useState(true);

  const BeeIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 297 297"
      className="w-full h-full"
      fill="currentColor"
    >
      <path
        d="M262.223,87.121c-21.74-21.739-48.581-34.722-71.809-34.735c-0.373-4.733-1.523-9.251-3.337-13.418
      c0.21-0.178,0.419-0.359,0.617-0.558l16.139-16.139c3.82-3.82,3.82-10.013,0-13.833c-3.821-3.819-10.012-3.819-13.833,0
      l-14.795,14.795c-7.268-5.989-16.574-9.59-26.705-9.59c-10.131,0-19.436,3.601-26.705,9.59L107,8.439
      c-3.821-3.819-10.012-3.819-13.833,0c-3.82,3.82-3.82,10.013,0,13.833l16.139,16.139c0.198,0.198,0.407,0.38,0.617,0.558
      c-1.815,4.167-2.964,8.685-3.337,13.418c-23.228,0.013-50.069,12.996-71.809,34.735c-35.581,35.582-45.379,81.531-22.303,104.607
      c8.133,8.132,19.463,12.431,32.765,12.431c14.327,0,30.03-4.943,45.064-13.827v13.308c0,28.756,20.969,52.692,48.416,57.359v20.645
      c0,5.402,4.379,9.781,9.781,9.781c5.402,0,9.781-4.379,9.781-9.781v-20.645c27.447-4.667,48.416-28.603,48.416-57.359v-13.308
      c15.034,8.884,30.737,13.827,45.064,13.827c0.001,0,0.001,0,0.002,0c13.3,0,24.629-4.298,32.763-12.431
      C307.601,168.652,297.804,122.703,262.223,87.121z M148.5,78.187c-2.054-4.99-5.252-9.506-9.115-13.37
      c-3.799-3.798-8.302-6.748-13.37-8.827c-0.001-0.097-0.011-0.191-0.011-0.288c0-12.405,10.091-22.496,22.496-22.496
      c12.405,0,22.496,10.091,22.496,22.496c0,0.097-0.01,0.192-0.011,0.289c-5.068,2.078-9.571,5.029-13.37,8.827
      C153.752,68.681,150.554,73.197,148.5,78.187 M148.5,119.137c2.248,7.509,5.611,15.18,10.032,22.768
      c-3.225,0.547-6.591,0.848-10.032,0.848c-3.441,0-6.806-0.301-10.032-0.848C142.889,134.318,146.252,126.646,148.5,119.137z
      M26.307,177.895c-14.808-14.809-4.594-50.044,22.303-76.942c17.891-17.891,40.119-29.006,58.01-29.006
      c8.115,0,14.484,2.255,18.932,6.702c14.808,14.809,4.594,50.044-22.303,76.942c-17.891,17.891-40.119,29.005-58.01,29.005
      C37.123,184.597,30.754,182.343,26.307,177.895z M187.135,203.64c0,21.303-17.332,38.635-38.635,38.635
      c-21.303,0-38.635-17.332-38.635-38.635v-3.279c10.207,6.479,23.673,10.37,38.635,10.37c14.962,0,28.428-3.891,38.635-10.37V203.64z
      M148.5,191.17c-16.991,0-32.249-7.167-37.059-16.41c1.912-1.715,3.796-3.491,5.64-5.335c3.31-3.311,6.396-6.711,9.254-10.174
      c6.801,1.975,14.272,3.065,22.164,3.065c7.893,0,15.367-1.086,22.168-3.061c2.857,3.462,5.942,6.861,9.251,10.17
      c1.844,1.844,3.728,3.62,5.64,5.335C180.749,184.002,165.491,191.17,148.5,191.17z M270.693,177.895
      c-4.447,4.447-10.816,6.703-18.931,6.702c-17.892,0-40.12-11.114-58.011-29.005c-26.898-26.898-37.112-62.133-22.303-76.942
      c4.447-4.447,10.816-6.702,18.932-6.702c17.891,0,40.119,11.114,58.01,29.006C275.288,127.852,285.501,163.086,270.693,177.895z"
      />
    </svg>
  );

  useEffect(() => {
    const fetchUserType = async () => {
      setIsUserTypeLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No auth token found");

        const response = await axiosInstance.get(`/user/${userId}`);

        const user = response.data?.data?.user ?? response.data?.user;
        if (!user) throw new Error("User payload missing");

        setUserType(user.type || "Producer");
        setSubTypes(Array.isArray(user.sub_type) ? user.sub_type : []);
      } catch (err) {
        console.error("Error fetching user type:", err);
        setUserType("Producer");
        setSubTypes([]);
      } finally {
        setIsUserTypeLoading(false);
      }
    };

    if (userId) {
      fetchUserType();
    }
  }, [userId]);

  const sections: SidebarSection[] = useMemo(() => {
    const base: SidebarSection[] = [
      {
        icon: faHome,
        labelKey: "dashboard",
        section: "Dashboard",
        route: `/platform/${userId}`,
        subItems: [],
      },
      {
        icon: faAddressBook,
        labelKey: "crm",
        section: "CRM",
        basePath: `/platform/${userId}/crm`,
        subItems: [
          {
            labelKey: "contacts",
            route: `/platform/${userId}/crm?view=contacts`,
          },
          {
            labelKey: "companies",
            route: `/platform/${userId}/crm?view=companies`,
          },
          {
            labelKey: "contracts",
            route: `/platform/${userId}/crm?view=contracts`,
          },
          {
            labelKey: "receipts",
            route: `/platform/${userId}/crm?view=receipts`,
          },
          { labelKey: "tasks", route: `/platform/${userId}/crm?view=tasks` },
        ],
      },
    ];

    if (userType === "Producer") {
      if (subTypes.includes("Fishery")) {
        base.push({
          icon: faFish,
          labelKey: "fisheryFarm",
          section: "Fishery Farm",
          route: `/platform/${userId}/fishery`,
          subItems: [],
        });
      }
      if (subTypes.includes("Poultry")) {
        base.push({
          icon: faKiwiBird,
          labelKey: "poultryFarm",
          section: "Poultry Farm",
          route: `/platform/${userId}/poultry`,
          subItems: [],
        });
      }
      if (subTypes.includes("Cattle Rearing")) {
        base.push({
          icon: faCow,
          labelKey: "cattleRearing",
          section: "Cattle Rearing",
          route: `/platform/${userId}/cattle_rearing`,
          subItems: [],
        });
      }
      if (subTypes.includes("Apiculture")) {
        base.push({
          icon: BeeIcon,
          labelKey: "apiculture",
          section: "Apiculture",
          route: `/platform/${userId}/apiculture`,
          subItems: [],
        });
      }
      base.push({
        icon: faCloud,
        labelKey: "weatherMonitor",
        section: "Weather Monitor",
        route: `/platform/${userId}/weather`,
        subItems: [],
      });
    }

    base.push(
      {
        icon: faUsers,
        labelKey: "employees",
        section: "Labour",
        basePath: `/platform/${userId}/labour`,
        subItems: [
          {
            labelKey: "database",
            route: `/platform/${userId}/labour_database`,
          },
          {
            labelKey: "salaryManager",
            route: `/platform/${userId}/labour_payment`,
          },
        ],
      },
      {
        icon: faDollar,
        labelKey: "finance",
        section: "Finance",
        route: `/platform/${userId}/finance_dashboard`,
        subItems: [
          {
            labelKey: "dashboard",
            route: `/platform/${userId}/finance_dashboard`,
          },
          {
            labelKey: "sales",
            route: `/platform/${userId}/finance_sales`,
          },
          {
            labelKey: "expenses",
            route: `/platform/${userId}/finance_expenses`,
          },
        ],
      },
      {
        icon: faWarehouse,
        labelKey: "storage",
        section: "storage",
        route: `/platform/${userId}/storage`,
        subItems: [],
      }
    );

    return base;
  }, [userId, userType, subTypes]);

  const navigateTo = (route: string) => {
    router.push(route);
    setExpandedSection(null);
  };

  const handleSectionToggle = (
    section: string,
    hasSubItems: boolean,
    route?: string
  ) => {
    if (route && !hasSubItems) {
      navigateTo(route);
    } else if (hasSubItems) {
      const isOpen = expandedSection === section;
      setExpandedSection(isOpen ? null : section);
      if (!isOpen && onSectionChange) onSectionChange(section);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed((c) => !c);
    setExpandedSection(null);
  };

  const closeSubMenu = () => setExpandedSection(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const side = document.querySelector(".sidebar-container");
      if (side && !side.contains(e.target as Node)) closeSubMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) closeSubMenu();
  }, [isOpen]);

  return (
    <div
      className={`sidebar-container fixed inset-y-0 left-0 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-300 shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 lg:relative lg:shadow-none`}
      style={{ width: isCollapsed ? 60 : 230 }}
    >
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {isUserTypeLoading ? (
          <div className="text-center text-gray-400 text-sm px-4">
            <Loader />
            {!isCollapsed && <p className="mt-2">{t("loadingSidebar")}</p>}
          </div>
        ) : (
          sections.map(
            ({ icon, labelKey, section, route, basePath, subItems }) => {
              const hasSubItems = subItems.length > 0;
              const translatedLabel = t(labelKey);
              const isActive =
                (!hasSubItems && pathname === route) ||
                (hasSubItems && basePath && pathname.startsWith(basePath)) ||
                expandedSection === section;

              return (
                <div key={section} className="relative px-3">
                  <div
                    className={`flex items-center p-3 rounded-lg cursor-pointer group transition-colors duration-200 ${
                      isActive
                        ? "bg-gray-700 text-white shadow-md"
                        : "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    role="button"
                    tabIndex={0}
                    title={isCollapsed ? translatedLabel : ""}
                    onClick={() =>
                      handleSectionToggle(section, hasSubItems, route)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSectionToggle(section, hasSubItems, route);
                      }
                    }}
                  >
                    {typeof icon === "object" && "prefix" in icon ? (
                      <FontAwesomeIcon
                        icon={icon}
                        className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"}`}
                      />
                    ) : (
                      <div
                        className={`h-5 w-5 ${
                          isCollapsed ? "" : "mr-3"
                        } flex items-center justify-center text-current`}
                      >
                        {React.createElement(icon)}
                      </div>
                    )}

                    {!isCollapsed && (
                      <>
                        <span className="flex-grow font-medium text-sm truncate">
                          {translatedLabel}
                        </span>
                        {hasSubItems && (
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            className={`h-3 w-3 transition-transform duration-200 ${
                              expandedSection === section ? "rotate-90" : ""
                            } ${
                              isActive
                                ? "text-white"
                                : "text-gray-500 group-hover:text-gray-300"
                            }`}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {!isCollapsed &&
                    expandedSection === section &&
                    hasSubItems && (
                      <div className="mt-1 ml-5 pl-3 border-l border-gray-600 space-y-1">
                        {subItems.map((sub) => {
                          const translatedSubLabel = t(sub.labelKey);
                          const isSubActive =
                            pathname +
                              (searchParams.toString()
                                ? `?${searchParams.toString()}`
                                : "") ===
                            sub.route;
                          return (
                            <div
                              key={translatedSubLabel}
                              className={`text-sm py-2 px-4 rounded-md cursor-pointer transition-colors duration-150 ${
                                isSubActive
                                  ? "text-indigo-300 font-semibold"
                                  : "text-gray-400 hover:text-white hover:bg-gray-700"
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => navigateTo(sub.route)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigateTo(sub.route);
                                }
                              }}
                            >
                              {translatedSubLabel}
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              );
            }
          )
        )}
      </nav>

      <div className="mt-auto p-3 border-t border-gray-700">
        <button
          className={`w-full flex items-center p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors duration-200 ${
            isCollapsed ? "justify-center" : "justify-end"
          }`}
          onClick={toggleCollapse}
          title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          <FontAwesomeIcon
            icon={isCollapsed ? faChevronRight : faChevronLeft}
            className="h-5 w-5"
          />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
