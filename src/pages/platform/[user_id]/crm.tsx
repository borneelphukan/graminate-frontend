import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import SearchDropdown from "@/components/ui/SearchDropdown";
import Table from "@/components/tables/Table";
import PlatformLayout from "@/layout/PlatformLayout";
import Head from "next/head";
import { PAGINATION_ITEMS } from "@/constants/options";
import axiosInstance from "@/lib/utils/axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import ContactForm from "@/components/form/crm/ContactForm";
import CompanyForm from "@/components/form/crm/CompanyForm";
import ContractForm from "@/components/form/crm/ContractForm";
import ReceiptForm from "@/components/form/crm/ReceiptForm";
import TaskForm from "@/components/form/crm/TaskForm";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";

type View = "contacts" | "companies" | "contracts" | "receipts" | "tasks";

type Contact = {
  contact_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  type: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  created_at: string;
};

type Company = {
  company_id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone_number: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  type: string;
  created_at: string;
};

type Contract = {
  deal_id: number;
  deal_name: string;
  partner: string;
  amount: number;
  stage: string;
  start_date: string;
  end_date: string;
  category?: string;
  priority: string;
  created_at: string;
};

type Receipt = {
  invoice_id: number;
  title: string;
  bill_to: string;
  due_date: string;
  receipt_date: string;
  payment_terms?: string;
  notes?: string;
  tax?: number;
  discount?: number;
  shipping?: number;
  receipt_number?: string;
  issued_date?: string;
  bill_to_address_line1?: string;
  bill_to_address_line2?: string;
  bill_to_city?: string;
  bill_to_state?: string;
  bill_to_postal_code?: string;
  bill_to_country?: string;
};

type Task = {
  task_id: number;
  user_id: number;
  project: string;
  task: string | null;
  status: string | null;
  description: string | null;
  priority: string | null;
  deadline?: string | null;
  created_on: string;
};

type FetchedDataItem = Contact | Company | Contract | Receipt | Task;

type AggregatedTaskProject = {
  project: string;
  taskCount: number;
  createdOn: string;
  id: number;
  rowProjectIdentifier: string;
};

const mapSupportedLanguageToLocale = (lang: SupportedLanguage): string => {
  switch (lang) {
    case "English":
      return "en";
    case "Hindi":
      return "hi";
    case "Assamese":
      return "as";
    default:
      return "en";
  }
};

const CRM = () => {
  const router = useRouter();
  const { user_id, view: queryView } = router.query;
  const { timeFormat, language: currentLanguage } = useUserPreferences();

  const view: View =
    typeof queryView === "string" &&
    ["contacts", "companies", "contracts", "receipts", "tasks"].includes(
      queryView
    )
      ? (queryView as View)
      : "contacts";

  const [loading, setLoading] = useState(true);
  const [contactsData, setContactsData] = useState<Contact[]>([]);
  const [companiesData, setCompaniesData] = useState<Company[]>([]);
  const [contractsData, setContractsData] = useState<Contract[]>([]);
  const [receiptsData, setReceiptsData] = useState<Receipt[]>([]);
  const [tasksData, setTasksData] = useState<Task[]>([]);
  const [fetchedData, setFetchedData] = useState<FetchedDataItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [animate, setAnimate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClosePanelAnimation = useCallback(() => {
    setAnimate(false);
    setTimeout(() => setIsSidebarOpen(false), 300);
  }, [setAnimate, setIsSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      setAnimate(true);
      document.body.classList.add("overflow-hidden");
      return () => {
        document.body.classList.remove("overflow-hidden");
      };
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(event.target as Node)
        ) {
          handleClosePanelAnimation();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSidebarOpen, panelRef, handleClosePanelAnimation]);

  const dropdownItems = [
    { label: "Contacts", view: "contacts" },
    { label: "Companies", view: "companies" },
    { label: "Contracts", view: "contracts" },
    { label: "Receipts", view: "receipts" },
    { label: "Projects", view: "tasks" },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!router.isReady || !user_id) return;

    const userIdString = Array.isArray(user_id) ? user_id[0] : user_id;
    if (!userIdString) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        const [contactsRes, companiesRes, contractsRes, receiptsRes, tasksRes] =
          await Promise.all([
            axiosInstance.get<{ contacts: Contact[] }>(
              `/contacts/${userIdString}`
            ),
            axiosInstance.get<{ companies: Company[] }>(
              `/companies/${userIdString}`
            ),
            axiosInstance.get<{ contracts: Contract[] }>(
              `/contracts/${userIdString}`
            ),
            axiosInstance.get<{ receipts: Receipt[] }>(
              `/receipts/${userIdString}`
            ),
            axiosInstance.get<{ tasks: Task[] }>(`/tasks/${userIdString}`),
          ]);

        setContactsData(contactsRes.data.contacts || []);
        setCompaniesData(companiesRes.data.companies || []);
        setContractsData(contractsRes.data.contracts || []);
        setReceiptsData(receiptsRes.data.receipts || []);
        setTasksData(tasksRes.data.tasks || []);
      } catch (error) {
        setContactsData([]);
        setCompaniesData([]);
        setContractsData([]);
        setReceiptsData([]);
        setTasksData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router.isReady, user_id]);

  useEffect(() => {
    switch (view) {
      case "contacts":
        setFetchedData(contactsData);
        break;
      case "companies":
        setFetchedData(companiesData);
        break;
      case "contracts":
        setFetchedData(contractsData);
        break;
      case "receipts":
        setFetchedData(receiptsData);
        break;
      case "tasks":
        setFetchedData(tasksData);
        break;
      default:
        setFetchedData([]);
    }
  }, [
    view,
    contactsData,
    companiesData,
    contractsData,
    receiptsData,
    tasksData,
  ]);

  const tableData = useMemo(() => {
    const locale = mapSupportedLanguageToLocale(currentLanguage);
    const dateTimeOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: timeFormat === "12-hour",
    };
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    };

    switch (view) {
      case "contacts":
        if (fetchedData.length === 0) return { columns: [], rows: [] };
        return {
          columns: [
            "#",
            "First Name",
            "Last Name",
            "Email",
            "Phone",
            "Type",
            "Address",
            "Created On",
          ],
          rows: fetchedData
            .filter((item): item is Contact => "contact_id" in item)
            .map((item) => [
              item.contact_id,
              item.first_name,
              item.last_name,
              item.email,
              item.phone_number,
              item.type,
              [
                item.address_line_1,
                item.address_line_2,
                item.city,
                item.state,
                item.postal_code,
              ]
                .filter(Boolean)
                .join(", "),
              new Date(item.created_at).toLocaleString(locale, dateTimeOptions),
            ]),
        };

      case "companies":
        if (fetchedData.length === 0) return { columns: [], rows: [] };
        return {
          columns: [
            "#",
            "Company Name",
            "Owner Name",
            "Email",
            "Phone Number",
            "Address",
            "Type",
            "Created On",
          ],
          rows: fetchedData
            .filter((item): item is Company => "company_id" in item)
            .map((item) => [
              item.company_id,
              item.company_name,
              item.contact_person,
              item.email,
              item.phone_number,
              [
                item.address_line_1,
                item.address_line_2,
                item.city,
                item.state,
                item.postal_code,
              ]
                .filter(Boolean)
                .join(", "),
              item.type,
              new Date(item.created_at).toLocaleDateString(locale, dateOptions),
            ]),
        };

      case "contracts":
        if (fetchedData.length === 0) return { columns: [], rows: [] };
        return {
          columns: [
            "#",
            "Contract",
            "Partner",
            "Status",
            "Category",
            "Priority",
            "End Date",
          ],
          rows: fetchedData
            .filter((item): item is Contract => "deal_id" in item)
            .map((item) => [
              item.deal_id,
              item.deal_name,
              item.partner,
              item.stage,
              item.category || "-",
              item.priority,
              new Date(item.end_date).toLocaleDateString(locale, dateOptions),
            ]),
        };

      case "receipts":
        if (fetchedData.length === 0) return { columns: [], rows: [] };
        return {
          columns: ["#", "Title", "Bill To", "Due Date", "Created On"],
          rows: fetchedData
            .filter((item): item is Receipt => "invoice_id" in item)
            .map((item) => [
              item.invoice_id,
              item.title,
              item.bill_to,
              new Date(item.due_date).toLocaleDateString(locale, dateOptions),
              new Date(item.receipt_date).toLocaleString(
                locale,
                dateTimeOptions
              ),
            ]),
        };

      case "tasks":
        if (fetchedData.length === 0 && tasksData.length === 0)
          return { columns: [], rows: [] };

        const allTaskEntries = tasksData;

        const projectGroups: Record<
          string,
          {
            count: number;
            representativeId: number;
            representativeCreatedOn: string;
          }
        > = {};

        allTaskEntries.forEach((entry) => {
          if (!projectGroups[entry.project]) {
            projectGroups[entry.project] = {
              count: 0,
              representativeId: entry.task_id,
              representativeCreatedOn: entry.created_on,
            };
          } else {
            const currentRepDate = new Date(
              projectGroups[entry.project].representativeCreatedOn
            );
            const entryDate = new Date(entry.created_on);

            if (entryDate < currentRepDate) {
              projectGroups[entry.project].representativeId = entry.task_id;
              projectGroups[entry.project].representativeCreatedOn =
                entry.created_on;
            } else if (entryDate.getTime() === currentRepDate.getTime()) {
              if (
                entry.task_id < projectGroups[entry.project].representativeId
              ) {
                projectGroups[entry.project].representativeId = entry.task_id;
              }
            }
          }

          if (entry.task !== null && entry.status !== null) {
            projectGroups[entry.project].count++;
          }
        });

        const aggregatedTaskRowsData: AggregatedTaskProject[] = Object.entries(
          projectGroups
        ).map(([project, data]) => ({
          id: data.representativeId,
          rowProjectIdentifier: project,
          project: project,
          createdOn: new Date(data.representativeCreatedOn).toLocaleString(
            locale,
            dateTimeOptions
          ),
          taskCount: data.count,
        }));

        return {
          columns: [
            "#",
            "Project / Task Category",
            "Number of Tasks",
            "Created On",
          ],
          rows: aggregatedTaskRowsData.map((aggRow) => [
            aggRow.id,
            aggRow.project,
            aggRow.taskCount,
            aggRow.createdOn,
          ]),
        };

      default:
        return { columns: [], rows: [] };
    }
  }, [fetchedData, view, tasksData, timeFormat, currentLanguage]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return tableData.rows;
    return tableData.rows.filter((row) =>
      row.some((cell) =>
        cell?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [tableData, searchQuery]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalRecordCount = filteredRows.length;

  const navigateTo = (newView: string) => {
    if (
      ["contacts", "companies", "contracts", "receipts", "tasks"].includes(
        newView
      )
    ) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("view", newView);
      router.push(currentUrl.toString());
      setDropdownOpen(false);
    }
  };

  const handleRowClick = (item: FetchedDataItem | AggregatedTaskProject) => {
    const userIdString = Array.isArray(user_id) ? user_id[0] : user_id;

    if (!userIdString) {
      return;
    }

    if (view === "tasks" && "rowProjectIdentifier" in item) {
      const projectItem = item as AggregatedTaskProject;
      router.push({
        pathname: `/platform/${userIdString}/tasks/${encodeURIComponent(
          projectItem.rowProjectIdentifier
        )}`,
        query: {
          project: projectItem.rowProjectIdentifier,
          user_id: userIdString,
        },
      });
      return;
    }

    let idToNavigate: number | string | undefined;
    let path = "";
    const dataItem = item as FetchedDataItem;

    if ("contact_id" in dataItem) {
      idToNavigate = dataItem.contact_id;
      path = `contacts/${idToNavigate}`;
    } else if ("company_id" in dataItem) {
      idToNavigate = dataItem.company_id;
      path = `companies/${idToNavigate}`;
    } else if ("deal_id" in dataItem) {
      idToNavigate = dataItem.deal_id;
      path = `contracts/${idToNavigate}`;
    } else if ("invoice_id" in dataItem) {
      idToNavigate = dataItem.invoice_id;
      path = `receipts/${idToNavigate}`;
    } else {
      return;
    }

    const rowData = JSON.stringify(dataItem);
    router.push({
      pathname: `/platform/${userIdString}/${path}`,
      query: {
        data: rowData,
        view,
      },
    });
  };

  const sidebarTitle = useMemo(() => {
    switch (view) {
      case "contacts":
        return "Create Contact";
      case "companies":
        return "Create Company";
      case "contracts":
        return "Create Contract";
      case "receipts":
        return "Create Receipt";
      case "tasks":
        return "Create Project";
      default:
        return "Create Item";
    }
  }, [view]);

  const getButtonText = (view: View) => {
    switch (view) {
      case "contacts":
        return "Create Contact";
      case "companies":
        return "Create Company";
      case "contracts":
        return "Create Contract";
      case "receipts":
        return "Create Receipt";
      case "tasks":
        return "Create Project";
      default:
        return "Create";
    }
  };

  return (
    <PlatformLayout>
      <Head>
        <title>
          Graminate | CRM - {view.charAt(0).toUpperCase() + view.slice(1)}
        </title>
      </Head>
      <div className="min-h-screen container mx-auto p-4">
        <div className="flex justify-between items-center dark:bg-dark relative mb-4">
          <div className="relative">
            <button
              className="flex items-center text-lg font-semibold dark:text-white rounded focus:outline-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              {dropdownItems.find((item) => item.view === view)?.label ||
                "Select View"}
              <FontAwesomeIcon
                icon={dropdownOpen ? faChevronUp : faChevronDown}
                className="ml-2 w-4 h-4"
                aria-hidden="true"
              />
            </button>
            {dropdownOpen && (
              <SearchDropdown items={dropdownItems} navigateTo={navigateTo} />
            )}
            <p className="text-xs text-dark dark:text-light">
              {totalRecordCount} Record(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              text={getButtonText(view)}
              style="primary"
              onClick={() => setIsSidebarOpen(true)}
            />
          </div>
        </div>
        <Table
          data={{ ...tableData, rows: paginatedRows }}
          filteredRows={filteredRows}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          paginationItems={PAGINATION_ITEMS}
          searchQuery={searchQuery}
          totalRecordCount={totalRecordCount}
          onRowClick={(rowArray) => {
            if (view === "tasks") {
              const representativeDbId = rowArray[0] as number;
              const projectName = rowArray[1] as string;
              const taskCount = rowArray[2] as number;
              const createdOn = rowArray[3] as string;

              const aggregatedItem: AggregatedTaskProject = {
                id: representativeDbId,
                rowProjectIdentifier: projectName,
                project: projectName,
                taskCount: taskCount,
                createdOn: createdOn,
              };
              handleRowClick(aggregatedItem);
            } else {
              const itemId = rowArray[0];
              const originalItem = fetchedData.find((item) => {
                if ("contact_id" in item && item.contact_id === itemId)
                  return true;
                if ("company_id" in item && item.company_id === itemId)
                  return true;
                if ("deal_id" in item && item.deal_id === itemId) return true;
                if ("invoice_id" in item && item.invoice_id === itemId)
                  return true;
                return false;
              });

              if (originalItem) {
                handleRowClick(originalItem);
              }
            }
          }}
          view={view}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={() => {}}
          setSearchQuery={setSearchQuery}
          loading={loading}
        />
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
            <div
              ref={panelRef}
              className="fixed top-0 right-0 h-full w-full md:w-[650px] bg-light dark:bg-gray-800 shadow-lg dark:border-l border-gray-700 overflow-y-auto"
              style={{
                transform: animate ? "translateX(0)" : "translateX(100%)",
                transition: "transform 300ms ease-out",
              }}
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-400 dark:border-gray-200">
                  <h2 className="text-xl font-semibold text-dark dark:text-light">
                    {sidebarTitle}
                  </h2>
                  <button
                    className="text-gray-300 hover:text-gray-200 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    onClick={handleClosePanelAnimation}
                    aria-label="Close panel"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6">
                  {view === "contacts" && (
                    <ContactForm
                      userId={user_id}
                      onClose={handleClosePanelAnimation}
                    />
                  )}
                  {view === "companies" && (
                    <CompanyForm
                      userId={user_id}
                      onClose={handleClosePanelAnimation}
                    />
                  )}
                  {view === "contracts" && (
                    <ContractForm
                      userId={user_id}
                      onClose={handleClosePanelAnimation}
                    />
                  )}
                  {view === "receipts" && (
                    <ReceiptForm
                      userId={user_id}
                      onClose={handleClosePanelAnimation}
                    />
                  )}
                  {view === "tasks" && (
                    <TaskForm
                      userId={user_id}
                      onClose={handleClosePanelAnimation}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
};

export default CRM;
