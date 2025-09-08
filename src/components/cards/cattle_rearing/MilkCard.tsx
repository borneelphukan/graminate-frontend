import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Chart,
  CartesianScaleOptions,
} from "chart.js";
import TextField from "@/components/ui/TextField";
import DropdownSmall from "@/components/ui/Dropdown/DropdownSmall";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import axiosInstance from "@/lib/utils/axiosInstance";
import Swal from "sweetalert2";
import {
  format,
  subMonths,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  isBefore,
  isValid as isValidDate,
  subDays as subDaysDateFns,
  isSameDay,
  parseISO,
} from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlassWaterDroplet } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/router";
import Table from "@/components/tables/Table";
import {
  useUserPreferences,
  SupportedLanguage,
} from "@/contexts/UserPreferencesContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

const TIME_RANGE_OPTIONS = ["Weekly", "1 Month", "3 Months"] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
const ALL_ANIMALS_FILTER = "Overall Milk Production";
const PAGINATION_ITEMS = ["25 per page", "50 per page", "100 per page"];

type CattleMilkRecordFromApi = {
  milk_id: number;
  cattle_id: number;
  user_id: number;
  date_collected: string;
  animal_name: string | null;
  milk_produced: string;
  date_logged: string;
};

type ProcessedCattleMilkRecord = {
  milk_id: number;
  cattle_id: number;
  user_id: number;
  date_collected: Date;
  animal_name: string | null;
  milk_produced: number;
  date_logged: string;
};

interface MilkCardProps {
  userId?: string;
  cattleId?: string;
}

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

const today = new Date();
today.setHours(0, 0, 0, 0);

const MilkCard = ({ userId, cattleId }: MilkCardProps) => {
  const router = useRouter();
  const { timeFormat, language: currentLanguage } = useUserPreferences();

  const [activeView, setActiveView] = useState<"chart" | "form" | "table">(
    "chart"
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(
    TIME_RANGE_OPTIONS[0]
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allMilkRecords, setAllMilkRecords] = useState<
    ProcessedCattleMilkRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ProcessedCattleMilkRecord | null>(null);
  const [formData, setFormData] = useState({
    date_collected: format(new Date(), "yyyy-MM-dd"),
    milk_produced: "",
    animal_name: "",
  });
  const [availableAnimals, setAvailableAnimals] = useState<string[]>([]);
  const [selectedAnimalFilter, setSelectedAnimalFilter] =
    useState<string>(ALL_ANIMALS_FILTER);

  const [animalNameSuggestions, setAnimalNameSuggestions] = useState<string[]>(
    []
  );
  const [isLoadingAnimalNameSuggestions, setIsLoadingAnimalNameSuggestions] =
    useState(false);
  const [showAnimalNameSuggestions, setShowAnimalNameSuggestions] =
    useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<Chart<"bar"> | null>(null);
  const animalNameSuggestionsRef = useRef<HTMLDivElement>(null);

  const fetchMilkData = useCallback(async () => {
    if (!cattleId) {
      setIsLoading(false);
      setAllMilkRecords([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axiosInstance.get<{
        cattleMilkRecords: CattleMilkRecordFromApi[];
      }>(`/cattle-milk/cattle/${cattleId}`);
      const processedRecords = response.data.cattleMilkRecords.map(
        (record) => ({
          ...record,
          date_collected: parseISO(record.date_collected),
          milk_produced: parseFloat(record.milk_produced) || 0,
        })
      );
      setAllMilkRecords(processedRecords);

      const uniqueAnimalNames = Array.from(
        new Set(
          processedRecords
            .map((r) => r.animal_name)
            .filter((name): name is string => !!name && name.trim() !== "")
        )
      ).sort();
      setAvailableAnimals([ALL_ANIMALS_FILTER, ...uniqueAnimalNames]);
    } catch (error) {
      console.error("Error fetching milk data:", error);
      setAllMilkRecords([]);
      setAvailableAnimals([]);
    } finally {
      setIsLoading(false);
    }
  }, [cattleId]);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        date_collected: format(editingRecord.date_collected, "yyyy-MM-dd"),
        milk_produced: editingRecord.milk_produced.toString(),
        animal_name: editingRecord.animal_name || "",
      });
    } else {
      setFormData({
        date_collected: format(new Date(), "yyyy-MM-dd"),
        milk_produced: "",
        animal_name: "",
      });
    }
  }, [editingRecord]);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "animal_name") {
      if (value.length > 0 && animalNameSuggestions.length > 0) {
        setShowAnimalNameSuggestions(true);
      } else {
        setShowAnimalNameSuggestions(false);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date_collected || !formData.milk_produced) {
      Swal.fire(
        "Error",
        "Date Collected and Milk Produced are required.",
        "error"
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: parseInt(userId!, 10),
        cattle_id: parseInt(cattleId!, 10),
        date_collected: formData.date_collected,
        milk_produced: parseFloat(formData.milk_produced),
        animal_name: formData.animal_name || null,
      };

      if (editingRecord) {
        await axiosInstance.put(
          `/cattle-milk/update/${editingRecord.milk_id}`,
          payload
        );
        Swal.fire("Success", "Milk record updated successfully!", "success");
      } else {
        await axiosInstance.post("/cattle-milk/add", payload);
        Swal.fire("Success", "Milk record logged successfully!", "success");
      }
      await fetchMilkData();
      setEditingRecord(null);
      setActiveView("table");
    } catch (error) {
      console.error("Failed to save milk record:", error);
      Swal.fire(
        "Error",
        "Failed to save milk record. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchAnimalNameSuggestions = async () => {
      if (!cattleId || activeView !== "form") {
        setAnimalNameSuggestions([]);
        return;
      }
      setIsLoadingAnimalNameSuggestions(true);
      try {
        const response = await axiosInstance.get<{ animalNames: string[] }>(
          `/cattle-milk/animal-names/${cattleId}`
        );
        setAnimalNameSuggestions(response.data.animalNames || []);
      } catch (error) {
        console.error("Error fetching animal name suggestions:", error);
        setAnimalNameSuggestions([]);
      } finally {
        setIsLoadingAnimalNameSuggestions(false);
      }
    };
    fetchAnimalNameSuggestions();
  }, [cattleId, activeView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        animalNameSuggestionsRef.current &&
        !animalNameSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowAnimalNameSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setDateOffset(0);
    setSelectedAnimalFilter(ALL_ANIMALS_FILTER);
  }, [selectedTimeRange, startDate, endDate, cattleId]);

  const handleStartDateChange = (dateString: string) => {
    if (dateString) {
      const d = new Date(dateString);
      if (isValidDate(d)) {
        d.setHours(0, 0, 0, 0);
        setStartDate(d);
        if (endDate && isBefore(endDate, d)) setEndDate(null);
      } else {
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (dateString: string) => {
    if (dateString) {
      const d = new Date(dateString);
      if (isValidDate(d)) {
        d.setHours(23, 59, 59, 999);
        setEndDate(d);
        if (startDate && isBefore(d, startDate)) setStartDate(null);
      } else {
        setEndDate(null);
      }
    } else {
      setEndDate(null);
    }
  };

  const isCustomDateRangeActive = useMemo(
    () =>
      !!(
        startDate &&
        endDate &&
        isValidDate(startDate) &&
        isValidDate(endDate) &&
        !isBefore(endDate, startDate)
      ),
    [startDate, endDate]
  );

  const navigationStates = useMemo(() => {
    let prevDisabled = true;
    let nextDisabled = true;
    if (!isCustomDateRangeActive) {
      nextDisabled = dateOffset === 0;
      if (selectedTimeRange === "Weekly" || selectedTimeRange === "1 Month") {
        prevDisabled = false;
      } else {
        prevDisabled = true;
      }
    }
    return { isPrevDisabled: prevDisabled, isNextDisabled: nextDisabled };
  }, [dateOffset, selectedTimeRange, isCustomDateRangeActive]);

  const isPrevDisabled = navigationStates.isPrevDisabled;
  const isNextDisabled = navigationStates.isNextDisabled;

  const currentIntervalDates = useMemo(() => {
    let viewStart: Date, viewEnd: Date;
    if (isCustomDateRangeActive && startDate && endDate) {
      viewStart = startDate;
      viewEnd = endDate;
    } else {
      const refDate = today;
      if (selectedTimeRange === "Weekly") {
        const targetDate = addWeeks(refDate, dateOffset);
        viewEnd = targetDate;
        viewStart = subDaysDateFns(targetDate, 6);
      } else if (selectedTimeRange === "1 Month") {
        const targetMonthDate = addMonths(refDate, dateOffset);
        viewStart = new Date(
          targetMonthDate.getFullYear(),
          targetMonthDate.getMonth(),
          1
        );
        viewEnd = new Date(
          targetMonthDate.getFullYear(),
          targetMonthDate.getMonth() + 1,
          0
        );
        if (dateOffset === 0) {
          viewEnd = new Date(Math.min(refDate.getTime(), viewEnd.getTime()));
        } else if (isBefore(viewEnd, viewStart)) {
          viewStart = new Date(viewEnd.getFullYear(), viewEnd.getMonth(), 1);
        }
      } else {
        viewEnd = refDate;
        viewStart = subMonths(refDate, 3);
      }
    }
    if (
      isValidDate(viewStart) &&
      isValidDate(viewEnd) &&
      !isBefore(viewEnd, viewStart)
    ) {
      return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }
    return [];
  }, [
    isCustomDateRangeActive,
    startDate,
    endDate,
    selectedTimeRange,
    dateOffset,
  ]);

  useEffect(() => {
    fetchMilkData();
  }, [cattleId, fetchMilkData]);

  useEffect(() => {
    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
      barChartInstanceRef.current = null;
    }
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(
          0,
          0,
          barChartRef.current.width,
          barChartRef.current.height
        );
      }
    }
    if (
      isLoading ||
      !barChartRef.current ||
      currentIntervalDates.length === 0 ||
      activeView !== "chart"
    )
      return;
    const ctx = barChartRef.current.getContext("2d");
    if (!ctx) return;
    let xAxisSubtitle = "";
    if (isCustomDateRangeActive && startDate && endDate) {
      xAxisSubtitle = `Range: ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    } else {
      const viewStart = currentIntervalDates[0];
      const viewEnd = currentIntervalDates[currentIntervalDates.length - 1];
      if (selectedTimeRange === "Weekly") {
        xAxisSubtitle = `Week: ${format(viewStart, "MMM d")} - ${format(
          viewEnd,
          "MMM d, yyyy"
        )}`;
      } else if (selectedTimeRange === "1 Month") {
        xAxisSubtitle = `Period: ${format(viewStart, "MMM d, yyyy")} - ${format(
          viewEnd,
          "MMM d, yyyy"
        )}`;
      } else {
        xAxisSubtitle = `Last 3 Months: ${format(
          viewStart,
          "MMM d, yyyy"
        )} - ${format(viewEnd, "MMM d, yyyy")}`;
      }
    }
    const labels = currentIntervalDates.map((date) =>
      format(
        date,
        currentIntervalDates.length > 31
          ? "MMM d"
          : currentIntervalDates.length > 7 &&
            (selectedTimeRange === "1 Month" ||
              selectedTimeRange === "3 Months" ||
              isCustomDateRangeActive)
          ? "d"
          : "EEE d"
      )
    );
    const recordsToConsider =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? allMilkRecords
        : allMilkRecords.filter(
            (record) => record.animal_name === selectedAnimalFilter
          );
    const milkProducedData = currentIntervalDates.map((intervalDate) => {
      const recordsForDate = recordsToConsider.filter((record) =>
        isSameDay(record.date_collected, intervalDate)
      );
      const totalMilkForDate = recordsForDate.reduce(
        (sum, record) => sum + record.milk_produced,
        0
      );
      return totalMilkForDate;
    });
    const datasetLabel =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? "Total Milk Produced (Liters)"
        : `Milk Produced - ${selectedAnimalFilter} (Liters)`;
    const barChartData: ChartData<"bar"> = {
      labels: labels,
      datasets: [
        {
          label: datasetLabel,
          data: milkProducedData,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    };
    const isDarkMode = document.documentElement.classList.contains("dark");
    let maxTicksLimit;
    if (isCustomDateRangeActive) {
      if (currentIntervalDates.length <= 7)
        maxTicksLimit = currentIntervalDates.length;
      else if (currentIntervalDates.length <= 31)
        maxTicksLimit = Math.ceil(
          currentIntervalDates.length /
            (currentIntervalDates.length > 15 ? 2 : 1)
        );
      else maxTicksLimit = 15;
    } else {
      if (selectedTimeRange === "Weekly") maxTicksLimit = 7;
      else if (selectedTimeRange === "1 Month")
        maxTicksLimit =
          currentIntervalDates.length > 15 ? 15 : currentIntervalDates.length;
      else maxTicksLimit = 12;
    }
    const chartTitleText =
      selectedAnimalFilter === ALL_ANIMALS_FILTER
        ? "Herd Milk Production Overview"
        : `Milk Production: ${selectedAnimalFilter}`;
    const barChartOptions: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: isDarkMode ? "#e5e7eb" : "#4b5563",
            boxWidth: 12,
          },
        },
        title: {
          display: true,
          text: chartTitleText,
          color: isDarkMode ? "#e5e7eb" : "#1f2937",
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2) + " L";
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisSubtitle,
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            autoSkip: true,
            maxTicksLimit: maxTicksLimit,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Milk (Liters)",
            color: isDarkMode ? "#9CA3AF" : "#6B7280",
          },
          grid: {
            color: isDarkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "#d1d5db" : "#6b7280",
            callback: function (value) {
              return value + " L";
            },
          },
        },
      },
    };
    barChartInstanceRef.current = new ChartJS(ctx, {
      type: "bar",
      data: barChartData,
      options: barChartOptions,
    }) as Chart<"bar">;
    return () => {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
    };
  }, [
    selectedTimeRange,
    currentIntervalDates,
    isCustomDateRangeActive,
    startDate,
    endDate,
    allMilkRecords,
    isLoading,
    selectedAnimalFilter,
    activeView,
  ]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chartInstance = barChartInstanceRef.current;
      if (
        !chartInstance ||
        !chartInstance.options ||
        !chartInstance.options.plugins
      )
        return;
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (chartInstance.options.plugins.title) {
        chartInstance.options.plugins.title.color = isDarkMode
          ? "#e5e7eb"
          : "#1f2937";
      }
      if (
        chartInstance.options.plugins.legend &&
        chartInstance.options.plugins.legend.labels
      ) {
        chartInstance.options.plugins.legend.labels.color = isDarkMode
          ? "#e5e7eb"
          : "#4b5563";
      }
      if (chartInstance.options.scales) {
        const xScale = chartInstance.options.scales.x as
          | CartesianScaleOptions
          | undefined;
        const yScale = chartInstance.options.scales.y as
          | CartesianScaleOptions
          | undefined;
        if (xScale) {
          if (xScale.title)
            xScale.title.color = isDarkMode ? "#9CA3AF" : "#6B7280";
          if (xScale.ticks)
            xScale.ticks.color = isDarkMode ? "#d1d5db" : "#6b7280";
          if (xScale.grid)
            xScale.grid.color = isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)";
        }
        if (yScale) {
          if (yScale.title)
            yScale.title.color = isDarkMode ? "#9CA3AF" : "#6B7280";
          if (yScale.ticks)
            yScale.ticks.color = isDarkMode ? "#d1d5db" : "#6b7280";
          if (yScale.grid)
            yScale.grid.color = isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)";
        }
      }
      chartInstance.update("none");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handlePrev = () => setDateOffset((prev) => prev - 1);
  const handleNext = () => setDateOffset((prev) => prev + 1);
  const showTimeNavControls =
    !isCustomDateRangeActive &&
    (selectedTimeRange === "Weekly" || selectedTimeRange === "1 Month");

  const filteredMilkRecordsForTable = useMemo(() => {
    if (!searchQuery) return allMilkRecords;
    return allMilkRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [allMilkRecords, searchQuery]);

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
    const columns = [
      "ID",
      "Date Collected",
      "Animal Name/ID",
      "Milk Produced (L)",
      "Date Logged",
    ];
    const rows = filteredMilkRecordsForTable.map((record) => [
      record.milk_id,
      format(record.date_collected, "PP"),
      record.animal_name || "N/A",
      record.milk_produced.toFixed(2),
      new Date(parseISO(record.date_logged)).toLocaleString(
        locale,
        dateTimeOptions
      ),
    ]);
    return { columns, rows };
  }, [filteredMilkRecordsForTable, currentLanguage, timeFormat]);

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    const recordToEdit = allMilkRecords.find((r) => r.milk_id === recordId);
    if (recordToEdit) {
      setEditingRecord(recordToEdit);
      setActiveView("form");
    }
  };

  const handleBackToChart = () => {
    setEditingRecord(null);
    setActiveView("chart");
  };

  const filteredAnimalNameSuggestions = animalNameSuggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(formData.animal_name.toLowerCase())
  );

  const renderContent = () => {
    switch (activeView) {
      case "form":
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {editingRecord ? "Edit" : "Log New"} Milk Record
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  calendar
                  label="Date Collected"
                  value={formData.date_collected}
                  onChange={(val) => handleFormChange("date_collected", val)}
                />
                <TextField
                  label="Milk Produced (Liters)"
                  value={formData.milk_produced}
                  onChange={(val) => handleFormChange("milk_produced", val)}
                  placeholder="e.g., 10.5"
                />
              </div>
              <div className="relative">
                <TextField
                  label="Animal Name / Number (Optional)"
                  value={formData.animal_name}
                  onChange={(val) => handleFormChange("animal_name", val)}
                  onFocus={() =>
                    animalNameSuggestions.length > 0 &&
                    setShowAnimalNameSuggestions(true)
                  }
                  placeholder="e.g. Daisy, Tag #123"
                  isLoading={isLoadingAnimalNameSuggestions}
                />
                {showAnimalNameSuggestions &&
                  filteredAnimalNameSuggestions.length > 0 && (
                    <div
                      ref={animalNameSuggestionsRef}
                      className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600"
                    >
                      <p className="text-xs p-2 text-gray-400 dark:text-gray-500">
                        Suggestions...
                      </p>
                      {filteredAnimalNameSuggestions.map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-400 dark:hover:bg-gray-600 text-sm cursor-pointer text-gray-700 dark:text-gray-200"
                            onClick={() => {
                              handleFormChange("animal_name", suggestion);
                              setShowAnimalNameSuggestions(false);
                            }}
                          >
                            {suggestion}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  text="Cancel"
                  style="secondary"
                  onClick={() =>
                    editingRecord
                      ? setActiveView("table")
                      : setActiveView("chart")
                  }
                />
                <Button
                  text={editingRecord ? "Update Record" : "Add Record"}
                  type="submit"
                  style="primary"
                  isDisabled={isSubmitting}
                />
              </div>
            </form>
          </div>
        );
      case "table":
        return (
          <Table
            data={tableData}
            filteredRows={tableData.rows}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            paginationItems={PAGINATION_ITEMS}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecordCount={tableData.rows.length}
            view="cattle_milk"
            loading={isLoading}
            reset={true}
            download={true}
            onRowClick={handleRowClick}
          />
        );
      case "chart":
      default:
        return (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center sm:text-left">
              Select a time range or specify a custom date range for an
              overview.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start gap-3 sm:gap-4 my-4">
              <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
                <TextField
                  label="Start Date"
                  calendar
                  value={
                    startDate && isValidDate(startDate)
                      ? format(startDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={handleStartDateChange}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
                <TextField
                  label="End Date"
                  calendar
                  value={
                    endDate && isValidDate(endDate)
                      ? format(endDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={handleEndDateChange}
                  placeholder="YYYY-MM-DD"
                  isDisabled={!startDate || !isValidDate(startDate)}
                />
              </div>
              {!isCustomDateRangeActive && (
                <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
                  <DropdownSmall
                    label="Time Range"
                    items={TIME_RANGE_OPTIONS.slice()}
                    selected={selectedTimeRange}
                    onSelect={(item) => {
                      setSelectedTimeRange(item as TimeRange);
                      setStartDate(null);
                      setEndDate(null);
                    }}
                    placeholder="Select Time Range"
                  />
                </div>
              )}
              {availableAnimals.length > 1 && (
                <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]">
                  <DropdownSmall
                    label="Filter by Animal"
                    items={availableAnimals}
                    selected={selectedAnimalFilter}
                    onSelect={(item) => setSelectedAnimalFilter(item)}
                    placeholder="Select Animal"
                  />
                </div>
              )}
            </div>
            <div
              className="flex-grow"
              style={{ minHeight: "300px", position: "relative" }}
            >
              <canvas ref={barChartRef}></canvas>
              {isLoading && (
                <div className="absolute inset-0 flex justify-center items-center bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 z-10">
                  <Loader />
                </div>
              )}
              {!isLoading && currentIntervalDates.length === 0 && (
                <div className="absolute inset-0 flex justify-center items-center text-gray-500 dark:text-gray-400">
                  Select a valid date range to view data.
                </div>
              )}

            </div>
            {showTimeNavControls &&
              currentIntervalDates.length > 0 &&
              !isLoading && (
                <div className="flex justify-center items-center gap-x-3 mt-4">
                  <Button
                    text="Previous"
                    arrow="left"
                    style="ghost"
                    isDisabled={isPrevDisabled}
                    onClick={handlePrev}
                  />
                  <Button
                    text="Next"
                    arrow="right"
                    style="ghost"
                    isDisabled={isNextDisabled}
                    onClick={handleNext}
                  />
                </div>
              )}
          </>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2">
          <div className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-200">
            <FontAwesomeIcon
              icon={faGlassWaterDroplet}
              className="mr-3 text-blue-500"
            />
            Milk Production
            {activeView === "table" && " Logs"}
          </div>
          <div className="flex items-center gap-2">
            {activeView !== "chart" && (
              <Button
                text="Back to Overview"
                style="secondary"
                arrow="left"
                onClick={handleBackToChart}
              />
            )}
            {activeView === "chart" && (
              <Button
                text="View Logs"
                style="secondary"
                onClick={() => setActiveView("table")}
                isDisabled={!userId || !cattleId || allMilkRecords.length === 0}
              />
            )}
            {activeView !== "form" && (
              <Button
                text="Log Milk"
                style="primary"
                onClick={() => {
                  setEditingRecord(null);
                  setActiveView("form");
                }}
                isDisabled={!userId || !cattleId}
              />
            )}
          </div>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default MilkCard;
