import React, {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import Overview from "./Overview";
import * as XLSX from "xlsx";
// Conditionally import Tauri API
let invoke = null;
let listen = null;
if (typeof window !== "undefined" && window.__TAURI_IPC__) {
  import("@tauri-apps/api/tauri").then((module) => {
    invoke = module.invoke;
  });
  import("@tauri-apps/api/event").then((module) => {
    listen = module.listen;
  });
}

// Theme Context
const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const AppContent = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [availableTags, setAvailableTags] = useState([]);
  const [tagColors, setTagColors] = useState({});
  const [selectedTag, setSelectedTag] = useState("");
  const [entryText, setEntryText] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isAutoLocked, setIsAutoLocked] = useState(false);
  const [error, setError] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);

  // Check if running in Tauri environment
  const isTauri = typeof window !== "undefined" && window.__TAURI_IPC__;

  // Helper function to use either Tauri or localStorage
  const useStorage = {
    async getEntries(date) {
      if (isTauri && invoke) {
        try {
          return await invoke("get_entries", { date });
        } catch (error) {
          console.warn(
            "Tauri command failed, falling back to localStorage:",
            error,
          );
        }
      }

      // Fallback to localStorage
      const storageKey = `entries_${date}`;
      const storedEntries = localStorage.getItem(storageKey);
      const lockedKey = `locked_${date}`;
      const lockedStatus = localStorage.getItem(lockedKey) === "true";

      return {
        entries: storedEntries ? JSON.parse(storedEntries) : [],
        locked: lockedStatus,
      };
    },

    async addEntries(date, entries) {
      if (isTauri && invoke) {
        try {
          await invoke("add_entries", { date, entries });
          return;
        } catch (error) {
          console.warn(
            "Tauri command failed, falling back to localStorage:",
            error,
          );
        }
      }

      // Fallback to localStorage
      const storageKey = `entries_${date}`;
      const entryObjects = entries.map((entry, index) => ({
        id: Date.now() + index,
        date: entry.date,
        tag: entry.tag,
        value: entry.amount,
        locked: false,
      }));
      localStorage.setItem(storageKey, JSON.stringify(entryObjects));
    },

    async lockDay(date) {
      if (isTauri && invoke) {
        try {
          return await invoke("lock_day", { date });
        } catch (error) {
          console.warn(
            "Tauri command failed, falling back to localStorage:",
            error,
          );
        }
      }

      // Fallback to localStorage
      const lockedKey = `locked_${date}`;
      localStorage.setItem(lockedKey, "true");
      return `Day ${date} locked successfully`;
    },

    async getTagConfig() {
      if (isTauri && invoke) {
        try {
          return await invoke("get_tag_config");
        } catch (error) {
          console.warn(
            "Tauri command failed, falling back to JSON file:",
            error,
          );
        }
      }

      // Try to load from public/tags.json
      try {
        const response = await fetch("/tags.json");
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn("Failed to load tags.json:", error);
      }

      // Fallback to localStorage
      const storedConfig = localStorage.getItem("tags_config");
      if (storedConfig) {
        return JSON.parse(storedConfig);
      }

      // If all else fails, return empty config
      throw new Error("No tag configuration available");
    },

    async getMonthlyEntries(month) {
      if (isTauri && invoke) {
        try {
          const monthlyEntries = await invoke("get_monthly_entries", {
            month: month,
          });
          return monthlyEntries;
        } catch (error) {
          console.error("Failed to get monthly entries:", error);
          return [];
        }
      }

      // Fallback for web version
      const storedEntries = JSON.parse(localStorage.getItem("entries") || "[]");
      return storedEntries.filter((entry) => entry.date.startsWith(month));
    },
  };

  // Load tag configuration
  useEffect(() => {
    const loadTagConfig = async () => {
      try {
        const config = await useStorage.getTagConfig();
        setAvailableTags(config.available_tags || []);
        setTagColors(config.tag_colors || {});
      } catch (error) {
        console.error("Failed to load tag configuration:", error);
        setAvailableTags([]);
        setTagColors({});
        setError(
          "Failed to load tag configuration. Please ensure tags.json is available.",
        );
      }
    };

    loadTagConfig();

    // Setup file watcher for tags.json changes (Tauri only)
    let unlisten = null;
    if (listen) {
      const setupWatcher = async () => {
        try {
          unlisten = await listen("tags-config-changed", () => {
            console.log("Tags config file changed, reloading...");
            loadTagConfig();
          });
        } catch (error) {
          console.error("Failed to setup file watcher:", error);
        }
      };
      setupWatcher();
    }

    // Cleanup function
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Load entries - using localStorage for now instead of Tauri
  // Load entries for selected date
  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      try {
        const response = await useStorage.getEntries(selectedDate);
        setEntries(response.entries || []);
        setIsLocked(response.locked || false);
        // Initially reset auto-lock status - it will be set by auto-lock logic if needed
        setIsAutoLocked(false);
      } catch (error) {
        console.error("Failed to load entries:", error);
        setEntries([]);
        setIsLocked(false);
        setIsAutoLocked(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [selectedDate]);

  // Auto-lock days that have already passed
  useEffect(() => {
    const autoLockPastDays = async () => {
      const today = new Date();
      const selectedDateObj = new Date(selectedDate);

      // Reset time to compare dates only (not times)
      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);

      // If the selected date is before today and not already locked
      if (selectedDateObj < today && !isLocked) {
        try {
          await useStorage.lockDay(selectedDate);
          setIsLocked(true);
          setIsAutoLocked(true);
          console.log(`Auto-locked past day: ${selectedDate}`);
        } catch (error) {
          console.error("Failed to auto-lock past day:", error);
        }
      }
    };

    // Only run auto-lock after entries are loaded (when not loading)
    if (!isLoading) {
      autoLockPastDays();
    }
  }, [selectedDate, isLocked, isLoading]);

  const getTagColor = (tag) => {
    return tagColors[tag] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedTag || !entryText.trim()) return;

    const numericValue = parseFloat(entryText.trim());
    if (isNaN(numericValue)) {
      setError("Please enter a valid number");
      return;
    }

    const newEntry = {
      date: selectedDate,
      tag: selectedTag,
      amount: numericValue,
      description: entryDescription.trim() || null, // Add description
    };

    try {
      // Add to existing entries
      const updatedEntries = [
        ...entries,
        {
          id: Date.now(),
          date: selectedDate,
          tag: selectedTag,
          value: numericValue,
          locked: false,
          description: entryDescription.trim() || null,
        },
      ];

      // Convert to format expected by Tauri
      const entryRequests = updatedEntries.map((entry) => ({
        date: entry.date,
        tag: entry.tag,
        amount: entry.value,
      }));

      await useStorage.addEntries(selectedDate, entryRequests);

      // Reload entries to get updated data with proper IDs
      const response = await useStorage.getEntries(selectedDate);
      setEntries(response.entries || []);
      setIsLocked(response.locked || false);

      setSelectedTag("");
      setEntryText("");
    } catch (error) {
      console.error("Failed to add entry:", error);
      setError("Failed to add entry: " + error.message);
    }
  };

  const handleDeleteEntry = async (entryToDelete) => {
    if (isLocked) return;

    try {
      const updatedEntries = entries.filter(
        (entry) => entry.id !== entryToDelete.id,
      );

      const entryRequests = updatedEntries.map((entry) => ({
        date: entry.date,
        tag: entry.tag,
        amount: entry.value,
      }));

      await useStorage.addEntries(selectedDate, entryRequests);

      // Reload entries to get updated data
      const response = await useStorage.getEntries(selectedDate);
      setEntries(response.entries || []);
      setIsLocked(response.locked || false);
      // Don't reset auto-lock status here since this is after manual deletion
    } catch (error) {
      console.error("Failed to delete entry:", error);
      setError("Failed to delete entry. Please try again.");
    }
  };

  const handleLockDay = async () => {
    if (
      !window.confirm(
        "Are you sure you want to lock this day? This cannot be undone.",
      )
    )
      return;

    try {
      const result = await useStorage.lockDay(selectedDate);
      setIsLocked(true);
      alert("Day locked successfully!");
    } catch (error) {
      console.error("Failed to lock day:", error);
      setError("Failed to lock day. Please try again.");
    }
  };

  const totalAmount = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.value, 0);
  }, [entries]);

  // Save tags to JSON file
  const saveTagsToFile = async (updatedTags, updatedColors) => {
    try {
      const tagConfig = {
        available_tags: updatedTags,
        tag_colors: updatedColors,
      };

      // For web version, we'll save to localStorage as backup
      // In a real implementation, this would need a backend API
      localStorage.setItem("tags_config", JSON.stringify(tagConfig));

      // Update local state
      setAvailableTags(updatedTags);
      setTagColors(updatedColors);

      console.log("Tags saved successfully");
    } catch (error) {
      console.error("Failed to save tags:", error);
      setError("Failed to save tags configuration");
    }
  };

  // Add new tag
  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setError("Tag name cannot be empty");
      return;
    }

    if (availableTags.includes(newTag.trim())) {
      setError("Tag already exists");
      return;
    }

    const updatedTags = [...availableTags, newTag.trim()];
    const colors = [
      "blue",
      "purple",
      "green",
      "yellow",
      "indigo",
      "pink",
      "orange",
      "red",
      "cyan",
      "emerald",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const updatedColors = {
      ...tagColors,
      [newTag.trim()]: `bg-${randomColor}-100 text-${randomColor}-800 border-${randomColor}-200`,
    };

    await saveTagsToFile(updatedTags, updatedColors);
    setNewTag("");
    setError("");
  };

  // Remove tag
  const handleRemoveTag = async (tagToRemove) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the tag "${tagToRemove}"? This will affect all entries using this tag.`,
      )
    ) {
      return;
    }

    const updatedTags = availableTags.filter((tag) => tag !== tagToRemove);
    const updatedColors = { ...tagColors };
    delete updatedColors[tagToRemove];

    await saveTagsToFile(updatedTags, updatedColors);
  };

  // Create table data for display and export
  const tableData = useMemo(() => {
    const groupedByTag = {};

    // Initialize with all available tags
    availableTags.forEach((tag) => {
      groupedByTag[tag] = [];
    });

    // Group entries by tag
    entries.forEach((entry) => {
      if (!groupedByTag[entry.tag]) {
        groupedByTag[entry.tag] = [];
      }
      groupedByTag[entry.tag].push(entry);
    });

    // Find the maximum number of entries for any tag
    const maxEntries = Math.max(
      ...Object.values(groupedByTag).map((arr) => arr.length),
      0,
    );

    // Create rows
    const rows = [];
    for (let i = 0; i < maxEntries; i++) {
      const row = {};
      availableTags.forEach((tag) => {
        const entry = groupedByTag[tag][i];
        row[tag] = entry ? entry.value.toFixed(2) : "";
      });
      rows.push(row);
    }

    // Calculate totals
    const totals = {};
    availableTags.forEach((tag) => {
      const sum = groupedByTag[tag].reduce(
        (sum, entry) => sum + entry.value,
        0,
      );
      totals[tag] = sum.toFixed(2);
    });

    return { rows, totals, groupedByTag };
  }, [entries, availableTags]);

  const exportToExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Get all entries for the selected month
      const selectedMonth = selectedDate.substring(0, 7); // YYYY-MM format
      const monthlyEntries = await useStorage.getMonthlyEntries(selectedMonth);

      // Sheet 1: Summary Overview
      const summaryData = [
        ["Evidence Tracker Export Summary"],
        [""],
        ["Export Date:", new Date().toLocaleDateString()],
        ["Selected Month:", selectedMonth],
        ["Total Entries:", monthlyEntries.length],
        [""],
        ["Category Breakdown:"],
        ["Category", "Count", "Total Amount"],
      ];

      availableTags.forEach((tag) => {
        const tagEntries = monthlyEntries.filter((entry) => entry.tag === tag);
        const count = tagEntries.length;
        const total = tagEntries.reduce((sum, entry) => sum + entry.value, 0);
        summaryData.push([tag, count, total.toFixed(2)]);
      });

      summaryData.push(
        [""],
        [
          "Grand Total:",
          "",
          entries.reduce((sum, entry) => sum + entry.value, 0).toFixed(2),
        ],
      );

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Sheet 2: Detailed Entries List
      const detailsData = [
        ["Date", "Time", "Category", "Amount", "Description"],
      ];

      monthlyEntries.forEach((entry) => {
        // If entry.timestamp is missing, generate it from entry.date
        let timestamp;
        if (entry.timestamp) {
          timestamp = new Date(entry.timestamp);
        } else if (entry.date) {
          // Try to parse entry.date as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
          const datePart = entry.date.split("T")[0];
          timestamp = new Date(datePart);
        } else {
          timestamp = new Date();
        }
        detailsData.push([
          entry.date,
          timestamp.toLocaleTimeString(),
          entry.tag,
          entry.value ? entry.value.toFixed(2) : "",
          entry.description || "",
        ]);
      });

      const detailsWs = XLSX.utils.aoa_to_sheet(detailsData);
      detailsWs["!cols"] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, detailsWs, "Detailed Entries");

      // Sheet 3: Monthly Analysis - Daily Breakdown
      const monthlyData = [
        ["Monthly Analysis - " + selectedMonth],
        [""],
        ["Date", ...availableTags, "Daily Total"],
      ];

      // Group monthly entries by date
      const entriesByDate = {};
      monthlyEntries.forEach((entry) => {
        if (!entriesByDate[entry.date]) {
          entriesByDate[entry.date] = {};
          availableTags.forEach((tag) => (entriesByDate[entry.date][tag] = 0));
        }
        entriesByDate[entry.date][entry.tag] += entry.value;
      });

      // Add daily totals
      Object.keys(entriesByDate)
        .sort()
        .forEach((date) => {
          const dayData = entriesByDate[date];
          const dailyTotal = availableTags.reduce(
            (sum, tag) => sum + (dayData[tag] || 0),
            0,
          );
          const row = [
            date,
            ...availableTags.map((tag) => (dayData[tag] || 0).toFixed(2)),
            dailyTotal.toFixed(2),
          ];
          monthlyData.push(row);
        });

      // Add monthly totals
      if (Object.keys(entriesByDate).length > 0) {
        monthlyData.push([""]); // Empty row
        const monthlyTotals = ["Monthly Total"];
        availableTags.forEach((tag) => {
          const tagTotal = Object.values(entriesByDate).reduce(
            (sum, dayData) => sum + (dayData[tag] || 0),
            0,
          );
          monthlyTotals.push(tagTotal.toFixed(2));
        });
        const grandTotal = monthlyEntries.reduce(
          (sum, entry) => sum + entry.value,
          0,
        );
        monthlyTotals.push(grandTotal.toFixed(2));
        monthlyData.push(monthlyTotals);
      }

      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
      monthlyWs["!cols"] = [
        { wch: 12 },
        ...availableTags.map(() => ({ wch: 12 })),
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, monthlyWs, "Monthly Analysis");

      // Sheet 4: Category Grid Layout (Current Day View)
      const gridData = [];
      gridData.push(["Category Grid - " + selectedDate]);
      gridData.push([]);
      gridData.push(availableTags);

      tableData.rows.forEach((row) => {
        const rowData = availableTags.map((tag) => row[tag] || "");
        gridData.push(rowData);
      });

      const totalsRow = availableTags.map((tag) => tableData.totals[tag]);
      gridData.push(totalsRow);

      const gridWs = XLSX.utils.aoa_to_sheet(gridData);
      gridWs["!cols"] = availableTags.map(() => ({ wch: 15 }));
      XLSX.utils.book_append_sheet(wb, gridWs, "Category Grid");

      // Generate Excel file and download
      const fileName = `Evidence_Tracker_Export_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(
        `Enhanced Excel file "${fileName}" has been downloaded with 4 sheets:\n• Summary - Overview and category breakdown for ${selectedMonth}\n• Detailed Entries - All entries for the month\n• Monthly Analysis - Daily breakdown and monthly totals\n• Category Grid - Current day view (${selectedDate})`,
      );
    } catch (error) {
      console.error("Failed to export Excel:", error);
      alert("Failed to export Excel file: " + error.message);
    }
  };

  if (showOverview) {
    return <Overview tagColors={tagColors} availableTags={availableTags} />;
  }

  // Debug info component
  const DebugInfo = () => (
    <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="font-semibold mb-2">Debug: Tag Configuration</h3>
      <div className="text-sm">
        <p>
          <strong>Available Tags:</strong> {JSON.stringify(availableTags)}
        </p>
        <p>
          <strong>Tag Colors:</strong> {JSON.stringify(tagColors)}
        </p>
        <p>
          <strong>Tags Count:</strong> {availableTags.length}
        </p>
        <p>
          <strong>Expected Tags:</strong> Andreea, Incarcari, Marius, Intrari,
          Iesiri
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900 to-slate-800"
          : "bg-gradient-to-br from-slate-50 to-indigo-50"
      }`}
    >
      {/* Header */}
      <header
        className={`shadow-lg border-b transition-colors duration-300 ${
          isDarkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1
                  className={`text-2xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Evidence Tracker
                </h1>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Track your daily activities and expenses
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center ${
                  isDarkMode
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                {isDarkMode ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowTagManager(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span>Manage Tags</span>
              </button>
              <button
                onClick={() => setShowOverview(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>View Overview</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Entry Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date Selection */}
            <div
              className={`rounded-xl shadow-md border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Select Date
                </h3>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-100"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              />
              {isLocked && (
                <div
                  className={`mt-3 p-3 border rounded-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-red-900/20 border-red-800"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? "text-red-400" : "text-red-800"
                      }`}
                    >
                      {isAutoLocked
                        ? "This day is auto-locked (past date)"
                        : "This day is locked"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Entry Form */}
            <div
              className={`rounded-xl shadow-md border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Add Entry
                </h3>
              </div>

              {error && (
                <div
                  className={`mb-4 p-3 border rounded-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-red-900/20 border-red-800"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-red-400" : "text-red-800"
                    }`}
                  >
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="tag"
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Tag
                  </label>
                  <select
                    id="tag"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    disabled={isLocked}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-slate-700 border-slate-600 text-slate-100 disabled:bg-slate-800"
                        : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-100"
                    }`}
                  >
                    <option value="">Select a tag...</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Amount
                  </label>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    value={entryText}
                    onChange={(e) => setEntryText(e.target.value)}
                    placeholder="Enter amount..."
                    disabled={isLocked}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 disabled:bg-slate-800"
                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-500 disabled:bg-slate-100"
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor="description">Description (Optional)</label>
                  <input
                    type="text"
                    id="description"
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    placeholder="Add a note..."
                    disabled={isLocked}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed transition-colors duration-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLocked || !selectedTag || !entryText.trim()}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                  Add Entry
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar with Summary */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div
              className={`rounded-xl shadow-md border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Daily Summary
                </h3>
                {!isLocked && entries.length > 0 && (
                  <button
                    onClick={handleLockDay}
                    className="ml-auto bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    Lock Day
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div
                  className={`flex justify-between items-center p-3 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? "bg-slate-700" : "bg-slate-50"
                  }`}
                >
                  <span
                    className={`font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Total:
                  </span>
                  <span
                    className={`font-bold ${totalAmount >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ${Math.abs(totalAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Entries Today:
                  </span>
                  <span
                    className={`font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {entries.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Available Tags:
                  </span>
                  <span
                    className={`font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {availableTags.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div
              className={`rounded-xl shadow-md border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  Export Data
                </h3>
              </div>
              <button
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    await exportToExcel();
                  } catch (error) {
                    console.error("Export failed:", error);
                    alert("Export failed: " + error.message);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={entries.length === 0 || isExporting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Table Display */}
        <div
          className={`mt-8 rounded-xl shadow-md border overflow-hidden transition-colors duration-300 ${
            isDarkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-6 py-4 border-b transition-colors duration-300 ${
              isDarkMode
                ? "border-slate-700 bg-gradient-to-r from-slate-700 to-slate-800"
                : "border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3
                    className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    Entries Table - {selectedDate}
                  </h3>
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Organized by category with totals
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p
                className={`mt-2 text-sm transition-colors duration-300 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Loading entries...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className={`mx-auto h-12 w-12 transition-colors duration-300 ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3
                className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? "text-slate-100" : "text-slate-900"
                }`}
              >
                No entries for this date
              </h3>
              <p
                className={`mt-1 text-sm transition-colors duration-300 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Add some entries to see the table.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full transition-colors duration-300 ${
                  isDarkMode ? "bg-slate-800" : "bg-white"
                }`}
              >
                <thead
                  className={`border-b transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <tr>
                    {availableTags.map((tag) => (
                      <th
                        key={tag}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y transition-colors duration-300 ${
                    isDarkMode ? "divide-slate-700" : "divide-slate-200"
                  }`}
                >
                  {tableData.rows.map((row, index) => (
                    <tr
                      key={index}
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50"
                      }`}
                    >
                      {availableTags.map((tag) => (
                        <td
                          key={tag}
                          className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                            isDarkMode ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {row[tag] && (
                            <div className="flex items-center justify-between">
                              <span>${row[tag]}</span>
                              {!isLocked && (
                                <button
                                  onClick={() => {
                                    const entry = tableData.groupedByTag[
                                      tag
                                    ].find(
                                      (e) => e.value.toFixed(2) === row[tag],
                                    );
                                    if (entry) handleDeleteEntry(entry);
                                  }}
                                  className="ml-2 text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {/* Actions column - can add edit functionality here if needed */}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot
                  className={`border-t-2 transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-slate-100 border-slate-300"
                  }`}
                >
                  <tr>
                    {availableTags.map((tag) => (
                      <td
                        key={tag}
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${
                          isDarkMode ? "text-slate-100" : "text-slate-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Total:</span>
                          <span
                            className={`${parseFloat(tableData.totals[tag]) >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            ${tableData.totals[tag]}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${
                        isDarkMode ? "text-slate-100" : "text-slate-900"
                      }`}
                    >
                      Grand Total:{" "}
                      <span
                        className={`${totalAmount >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${totalAmount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                Something went wrong
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                The application encountered an error. Please refresh the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = WrappedApp;

function WrappedApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default WrappedApp;
