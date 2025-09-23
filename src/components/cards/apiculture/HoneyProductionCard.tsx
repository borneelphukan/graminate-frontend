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
import { faJar } from "@fortawesome/free-solid-svg-icons";
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
const PAGINATION_ITEMS = [
  "10 per page",
  "25 per page",
  "50 per page",
  "100 per page",
];

type HoneyProductionRecordFromApi = {
  harvest_id: number;
  hive_id: number;
  user_id: number;
  harvest_date: string;
  hive_name: string | null;
  honey_weight: string;
  logged_at: string;
  frames_harvested: string | null;
  honey_type: string | null;
  harvest_notes: string | null;
};

type ProcessedHoneyRecord = {
  harvest_id: number;
  hive_id: number;
  user_id: number;
  harvest_date: Date;
  hive_name: string | null;
  honey_weight: number;
  logged_at: string;
  frames_harvested: number | null;
  honey_type: string | null;
  harvest_notes: string | null;
};

interface HoneyProductionCardProps {
  userId?: string;
  hiveId?: string;
}

type TextAreaProps = {
  label?: string;
  isDisabled?: boolean;
  type?: "disabled" | "";
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
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

const TextArea = ({
  label = "",
  isDisabled = false,
  type = "",
  placeholder = "",
  value,
  onChange,
}: TextAreaProps) => {
  const getFieldClass = () => {
    switch (type) {
      case "disabled":
        return "border border-gray-400 opacity-50 text-gray-100 placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-red-200";
      default:
        return "border border-gray-400 dark:border-gray-200 text-dark dark:text-light placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-green-200 dark:bg-gray-700";
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor="textarea"
          className="block mb-1 text-sm font-medium text-gray-200 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-start">
        <textarea
          id="textarea"
          className={`${getFieldClass()} py-2 px-4 rounded`}
          disabled={isDisabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        ></textarea>
      </div>
    </div>
  );
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const HoneyProductionCard = ({ userId, hiveId }: HoneyProductionCardProps) => {
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
  const [allHoneyRecords, setAllHoneyRecords] = useState<
    ProcessedHoneyRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ProcessedHoneyRecord | null>(null);
  const [formData, setFormData] = useState({
    harvest_date: format(new Date(), "yyyy-MM-dd"),
    honey_weight: "",
    frames_harvested: "",
    honey_type: "",
    harvest_notes: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<Chart<"bar"> | null>(null);

  const fetchHoneyData = useCallback(async () => {
    if (!hiveId) {
      setIsLoading(false);
      setAllHoneyRecords([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axiosInstance.get<{
        harvests: HoneyProductionRecordFromApi[];
      }>(`/honey-production/hive/${hiveId}`);
      const processedRecords = response.data.harvests.map(
        (record: HoneyProductionRecordFromApi) => ({
          ...record,
          harvest_date: parseISO(record.harvest_date),
          honey_weight: parseFloat(record.honey_weight) || 0,
          frames_harvested: record.frames_harvested
            ? parseInt(record.frames_harvested, 10)
            : null,
        })
      );
      setAllHoneyRecords(processedRecords);
    } catch (error) {
      console.error("Error fetching honey data:", error);
      setAllHoneyRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [hiveId]);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        harvest_date: format(editingRecord.harvest_date, "yyyy-MM-dd"),
        honey_weight: editingRecord.honey_weight.toString(),
        frames_harvested: editingRecord.frames_harvested?.toString() || "",
        honey_type: editingRecord.honey_type || "",
        harvest_notes: editingRecord.harvest_notes || "",
      });
    } else {
      setFormData({
        harvest_date: format(new Date(), "yyyy-MM-dd"),
        honey_weight: "",
        frames_harvested: "",
        honey_type: "",
        harvest_notes: "",
      });
    }
  }, [editingRecord]);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.harvest_date || !formData.honey_weight) {
      Swal.fire(
        "Error",
        "Harvest Date and Honey Weight are required.",
        "error"
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        hive_id: parseInt(hiveId!, 10),
        harvest_date: formData.harvest_date,
        honey_weight: parseFloat(formData.honey_weight),
        frames_harvested: formData.frames_harvested
          ? parseInt(formData.frames_harvested, 10)
          : undefined,
        honey_type: formData.honey_type || undefined,
        harvest_notes: formData.harvest_notes || undefined,
      };

      if (editingRecord) {
        await axiosInstance.put(
          `/honey-production/update/${editingRecord.harvest_id}`,
          payload
        );
        Swal.fire("Success", "Harvest updated successfully!", "success");
      } else {
        await axiosInstance.post("/honey-production/add", payload);
        Swal.fire("Success", "Harvest logged successfully!", "success");
      }
      await fetchHoneyData();
      setEditingRecord(null);
      setActiveView("table");
    } catch (error) {
      console.error("Failed to save harvest:", error);
      Swal.fire("Error", "Failed to save harvest. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setDateOffset(0);
  }, [selectedTimeRange, startDate, endDate, hiveId]);

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
    fetchHoneyData();
  }, [hiveId, fetchHoneyData]);

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
    const honeyHarvestedData = currentIntervalDates.map((intervalDate) => {
      const recordsForDate = allHoneyRecords.filter((record) =>
        isSameDay(record.harvest_date, intervalDate)
      );
      const totalHoneyForDate = recordsForDate.reduce(
        (sum, record) => sum + record.honey_weight,
        0
      );
      return totalHoneyForDate;
    });
    const datasetLabel = "Total Honey Harvested (kg)";
    const barChartData: ChartData<"bar"> = {
      labels: labels,
      datasets: [
        {
          label: datasetLabel,
          data: honeyHarvestedData,
          backgroundColor: "rgba(251, 191, 36, 0.6)",
          borderColor: "rgba(251, 191, 36, 1)",
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
    const chartTitleText = "Hive Honey Production Overview";
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
                label += context.parsed.y.toFixed(2) + " kg";
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
            text: "Honey (kg)",
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
              return value + " kg";
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
    allHoneyRecords,
    isLoading,
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

  const filteredHoneyRecordsForTable = useMemo(() => {
    if (!searchQuery) return allHoneyRecords;
    return allHoneyRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [allHoneyRecords, searchQuery]);

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
      "Harvest Date",
      "Honey Weight (kg)",
      "Frames Harvested",
      "Honey Type",
      "Date Logged",
    ];
    const rows = filteredHoneyRecordsForTable.map((record) => [
      record.harvest_id,
      format(record.harvest_date, "PP"),
      record.honey_weight.toFixed(2),
      record.frames_harvested ?? "N/A",
      record.honey_type || "N/A",
      new Date(parseISO(record.logged_at)).toLocaleString(
        locale,
        dateTimeOptions
      ),
    ]);
    return { columns, rows };
  }, [filteredHoneyRecordsForTable, currentLanguage, timeFormat]);

  const handleRowClick = (rowData: unknown[]) => {
    const recordId = rowData[0] as number;
    const recordToEdit = allHoneyRecords.find((r) => r.harvest_id === recordId);
    if (recordToEdit) {
      setEditingRecord(recordToEdit);
      setActiveView("form");
    }
  };

  const handleBackToChart = () => {
    setEditingRecord(null);
    setActiveView("chart");
  };

  const renderContent = () => {
    switch (activeView) {
      case "form":
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {editingRecord ? "Edit" : "Log New"} Honey Harvest
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  calendar
                  label="Harvest Date"
                  value={formData.harvest_date}
                  onChange={(val) => handleFormChange("harvest_date", val)}
                />
                <TextField
                  label="Honey Weight (kg)"
                  value={formData.honey_weight}
                  onChange={(val) => handleFormChange("honey_weight", val)}
                  placeholder="e.g., 15.5"
                />
                <TextField
                  label="Frames Harvested"
                  value={formData.frames_harvested}
                  onChange={(val) => handleFormChange("frames_harvested", val)}
                  placeholder="e.g., 8"
                />
                <TextField
                  label="Honey Type"
                  value={formData.honey_type}
                  onChange={(val) => handleFormChange("honey_type", val)}
                  placeholder="e.g., Wildflower"
                />
              </div>
              <TextArea
                label="Notes (Optional)"
                value={formData.harvest_notes}
                onChange={(val) => handleFormChange("harvest_notes", val)}
                placeholder="Add any relevant notes..."
              />
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
                  text={editingRecord ? "Update Harvest" : "Log Harvest"}
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
            view="honey_production"
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
          <div className="flex items-center text-lg font-semibold text-dark dark:text-light">
            <FontAwesomeIcon icon={faJar} className="mr-3 text-yellow-500" />
            Honey Production
            {activeView === "table" && " Logs"}
          </div>
          <div className="flex items-center gap-2">
            {activeView !== "chart" && (
              <Button
                text="Back"
                style="ghost"
                arrow="left"
                onClick={handleBackToChart}
              />
            )}
            {activeView === "chart" && (
              <Button
                text="View Logs"
                style="secondary"
                onClick={() => setActiveView("table")}
                isDisabled={!userId || !hiveId || allHoneyRecords.length === 0}
              />
            )}
            {activeView !== "form" && (
              <Button
                text="Log Harvest"
                style="primary"
                onClick={() => {
                  setEditingRecord(null);
                  setActiveView("form");
                }}
                isDisabled={!userId || !hiveId}
              />
            )}
          </div>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default HoneyProductionCard;
