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
  faPlus,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

import type { Sidebar as SidebarProps } from "@/types/card-props";
import Loader from "../ui/Loader";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, TranslationKey } from "@/translations";
import BeeIcon from "../../../public/icon/BeeIcon";

type SidebarSection = {
  icon: IconDefinition | React.ElementType;
  labelKey: TranslationKey;
  section: string;
  route?: string;
  basePath?: string;
  subItems: { labelKey: TranslationKey; route: string }[];
};

const Sidebar = ({ isOpen, userId, onSectionChange }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    language: currentLanguage,
    userType,
    subTypes,
    isSubTypesLoading,
    fetchUserSubTypes,
  } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);



  useEffect(() => {
    if (userId) {
      fetchUserSubTypes(userId);
    }
  }, [userId, fetchUserSubTypes]);

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
          { labelKey: "projects", route: `/platform/${userId}/crm?view=tasks` },
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
      },
      {
        icon: faPlus,
        labelKey: "addService",
        section: "Add Service",
        route: `/platform/${userId}/add_service`,
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
        {isSubTypesLoading ? (
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
