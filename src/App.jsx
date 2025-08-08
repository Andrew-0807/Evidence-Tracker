import React, { useState, useEffect, useMemo } from "react";
import Overview from "./Overview";
import { useStorage } from "./components/useStorage";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import Header from "./components/Header";
import EntryForm from "./components/EntryForm";
import DailySummary from "./components/DailySummary";
import Export from "./components/Export";
import EntriesTable from "./components/EntriesTable";
import TagManager from "./components/TagManager";
import GlobalSearch from "./components/GlobalSearch";
import UpdateManager from "./components/UpdateManager";
import ErrorBoundary from "./components/ErrorBoundary";
import { useLanguage } from "./localization/LanguageContext";

const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  // UI/Data state
  const [availableTags, setAvailableTags] = useState([]);
  const [tagColors, setTagColors] = useState({});
  const [selectedTag, setSelectedTag] = useState("");
  const [entryText, setEntryText] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  const [showSearch, setShowSearch] = useState(false);
  const [allEntries, setAllEntries] = useState([]);

  // ---------- Load tag configuration (with localStorage fallback) ----------
  useEffect(() => {
    const loadTagConfig = async () => {
      try {
        const config = await useStorage.getTagConfig();
        setAvailableTags(config.available_tags || []);
        setTagColors(config.tag_colors || {});
      } catch (err) {
        // Fallback to localStorage if present
        try {
          const raw = localStorage.getItem("tags_config");
          if (raw) {
            const saved = JSON.parse(raw);
            setAvailableTags(saved.available_tags || []);
            setTagColors(saved.tag_colors || {});
            return;
          }
        } catch (_) {
          /* noop */
        }

        console.error(
          translate(
            "Failed to load tag configuration. Please ensure tags.json is available.",
          ),
          err,
        );
        setAvailableTags([]);
        setTagColors({});
        setError(
          translate(
            "Failed to load tag configuration. Please ensure tags.json is available.",
          ),
        );
      }
    };

    loadTagConfig();
  }, [translate]);

  // ---------- Load entries for selected date ----------
  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      try {
        const response = await useStorage.getEntries(selectedDate);
        setEntries(response.entries || []);
        setIsLocked(response.locked || false);
        setIsAutoLocked(false);
      } catch (err) {
        console.error(translate("Failed to load entries:"), err);
        setEntries([]);
        setIsLocked(false);
        setIsAutoLocked(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [selectedDate, translate]);

  // ---------- Load last 90 days for global search ----------
  useEffect(() => {
    const loadAllEntries = async () => {
      try {
        const collected = [];
        const today = new Date();

        for (let i = 0; i < 90; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split("T")[0];

          try {
            const response = await useStorage.getEntries(dateString);
            if (response.entries?.length) {
              collected.push(
                ...response.entries.map((entry) => ({
                  ...entry,
                  date: dateString,
                })),
              );
            }
          } catch (_) {
            // skip missing days
          }
        }

        setAllEntries(collected);
      } catch (err) {
        console.error("Failed to load all entries:", err);
      }
    };

    loadAllEntries();
  }, []);

  // ---------- Cmd/Ctrl + K to open search ----------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---------- Auto-lock past days ----------
  useEffect(() => {
    const autoLockPastDays = async () => {
      const today = new Date();
      const selectedDateObj = new Date(selectedDate);

      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj < today && !isLocked) {
        try {
          await useStorage.lockDay(selectedDate);
          setIsLocked(true);
          setIsAutoLocked(true);
          console.log(translate("Auto-locked past day:") + ` ${selectedDate}`);
        } catch (err) {
          console.error(translate("Failed to auto-lock past day:"), err);
        }
      }
    };

    if (!isLoading) autoLockPastDays();
  }, [selectedDate, isLocked, isLoading, translate]);

  // ---------- Helpers ----------
  const getTagColor = (tag) => {
    if (tagColors[tag]) return tagColors[tag];
    return isDarkMode
      ? "bg-slate-800 text-slate-200 border-slate-700"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  const totalAmount = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.value, 0),
    [entries],
  );

  // ---------- Actions ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedTag || !entryText.trim()) return;

    const numericValue = parseFloat(entryText.trim());
    if (isNaN(numericValue)) {
      setError(translate("Please enter a valid number"));
      return;
    }

    const newEntry = {
      date: selectedDate,
      tag: selectedTag,
      value: numericValue,
      description: entryDescription.trim() || null,
    };

    try {
      const updatedEntries = [
        ...entries,
        {
          id: Date.now(),
          ...newEntry,
          locked: false,
        },
      ];

      const entryRequests = updatedEntries.map((entry) => ({
        date: entry.date,
        tag: entry.tag,
        value: entry.value,
        description: entry.description,
      }));

      await useStorage.addEntries(selectedDate, entryRequests);

      const response = await useStorage.getEntries(selectedDate);
      setEntries(response.entries || []);
      setIsLocked(response.locked || false);

      setSelectedTag("");
      setEntryText("");
      setEntryDescription("");
    } catch (err) {
      console.error("Failed to add entry:", err);
      setError(translate("Failed to add entry:") + " " + err?.message);
    }
  };

  const handleLockDay = async () => {
    if (
      !window.confirm(
        translate(
          "Are you sure you want to lock this day? This cannot be undone.",
        ),
      )
    )
      return;

    try {
      await useStorage.lockDay(selectedDate);
      setIsLocked(true);
      alert(translate("Day locked successfully!"));
    } catch (err) {
      console.error(translate("Failed to lock day:"), err);
      setError(translate("Failed to lock day. Please try again."));
    }
  };

  // ---------- Save tags ----------
  const saveTagsToFile = async (updatedTags, updatedColors) => {
    try {
      const tagConfig = {
        available_tags: updatedTags,
        tag_colors: updatedColors,
      };

      localStorage.setItem("tags_config", JSON.stringify(tagConfig));
      setAvailableTags(updatedTags);
      setTagColors(updatedColors);
      console.log("Tags saved successfully");
    } catch (err) {
      console.error("Failed to save tags:", err);
      setError("Failed to save tags configuration");
    }
  };

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
    const palette = [
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
    const random = palette[Math.floor(Math.random() * palette.length)];
    const updatedColors = {
      ...tagColors,
      [newTag.trim()]: `bg-${random}-100 text-${random}-800 border-${random}-200`,
    };

    await saveTagsToFile(updatedTags, updatedColors);
    setNewTag("");
    setError("");
  };

  const handleRemoveTag = async (tagToRemove) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the tag "${tagToRemove}"? This will affect all entries using this tag.`,
      )
    )
      return;

    const updatedTags = availableTags.filter((t) => t !== tagToRemove);
    const updatedColors = { ...tagColors };
    delete updatedColors[tagToRemove];

    await saveTagsToFile(updatedTags, updatedColors);
  };

  // ---------- Build table data for matrix view / export ----------
  const tableData = useMemo(() => {
    const groupedByTag = {};
    availableTags.forEach((tag) => (groupedByTag[tag] = []));

    entries.forEach((entry) => {
      if (!groupedByTag[entry.tag]) groupedByTag[entry.tag] = [];
      groupedByTag[entry.tag].push(entry);
    });

    const maxEntries = Math.max(
      ...Object.values(groupedByTag).map((arr) => arr.length),
      0,
    );

    const rows = [];
    for (let i = 0; i < maxEntries; i++) {
      const row = {};
      availableTags.forEach((tag) => {
        const entry = groupedByTag[tag][i];
        row[tag] = entry ? entry.value.toFixed(2) : "";
      });
      rows.push(row);
    }

    const totals = {};
    availableTags.forEach((tag) => {
      const sum = groupedByTag[tag].reduce(
        (acc, e) => acc + Number(e.value || 0),
        0,
      );
      totals[tag] = sum.toFixed(2);
    });

    return { rows, totals, groupedByTag };
  }, [entries, availableTags]);

  if (showOverview) {
    return <Overview tagColors={tagColors} availableTags={availableTags} />;
  }

  // ---------- Premium background + layout ----------
  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-950"
          : "bg-gradient-to-br from-slate-50 via-indigo-50 to-white"
      }`}
    >
      {/* Decorative background blobs (subtle, non-interactive) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={`absolute -top-32 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 ${
            isDarkMode ? "bg-indigo-600" : "bg-indigo-400"
          }`}
        />
        <div
          className={`absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-10 ${
            isDarkMode ? "bg-emerald-600" : "bg-emerald-400"
          }`}
        />
      </div>

      <Header
        onShowOverview={setShowOverview}
        onShowSearch={() => setShowSearch(true)}
      />

      {showSearch && (
        <GlobalSearch
          entries={allEntries}
          onClose={() => setShowSearch(false)}
        />
      )}

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Top hint: Cmd/Ctrl+K */}
        <div className="mb-6 flex items-center justify-end">
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              isDarkMode
                ? "bg-slate-900 text-slate-300 ring-slate-700"
                : "bg-white/70 text-slate-600 ring-slate-200 backdrop-blur"
            }`}
            title="Open search"
          >
            ⌘/Ctrl + K
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Entry + Table (dominant) */}
          <div className="lg:col-span-2 space-y-8">
            <EntryForm
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              isLocked={isLocked}
              isAutoLocked={isAutoLocked}
              error={error}
              handleSubmit={handleSubmit}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              availableTags={availableTags}
              entryText={entryText}
              setEntryText={setEntryText}
              entryDescription={entryDescription}
              setEntryDescription={setEntryDescription}
            />

            <EntriesTable
              isLoading={isLoading}
              entries={entries}
              selectedDate={selectedDate}
              availableTags={availableTags}
              tableData={tableData}
              getTagColor={getTagColor}
              isLocked={isLocked}
              totalAmount={totalAmount}
            />
          </div>

          {/* Right: Sticky summary + export */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              <DailySummary
                isLocked={isLocked}
                entries={entries}
                handleLockDay={handleLockDay}
                totalAmount={totalAmount}
                availableTags={availableTags}
              />
              <Export
                entries={entries}
                selectedDate={selectedDate}
                availableTags={availableTags}
                tableData={tableData}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Tag manager modal/section */}
      <TagManager
        showTagManager={showTagManager}
        setShowTagManager={setShowTagManager}
        availableTags={availableTags}
        newTag={newTag}
        setNewTag={setNewTag}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
        error={error}
      />
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UpdateManager />
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
