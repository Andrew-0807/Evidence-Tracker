import React, { useState, useEffect, useMemo } from "react";
import DailySalesChart from "./components/DailySalesChart";
import OverviewSidebar from "./components/OverviewSidebar";
import { useLanguage } from "./localization/LanguageContext";
import { useTheme } from "./components/ThemeProvider";
import MonthlySummary from "./components/MonthlySummary";
import CustomSums from "./components/CustomSums";

const Overview = ({
  tagColors = {},
  availableTags = [],
}) => {
  const [monthlyData, setMonthlyData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const { translate } = useLanguage();
  const { isDarkMode } = useTheme();

  // Helper: indicator color from provided tag color
  const getTagIndicatorColor = (tag) => {
    const tagColor = tagColors[tag];
    if (!tagColor) return "bg-slate-500";
    // Tries to map "bg-<color>-100" -> "bg-<color>-500"
    const bgMatch = tagColor.match(/bg-(\w+)-100/);
    if (bgMatch) return `bg-${bgMatch[1]}-500`;
    return "bg-slate-500";
  };

  // Load all months present in localStorage + ensure current month exists
  useEffect(() => {
    const loadAvailableMonths = () => {
      try {
        const allDates = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("entries_")) {
            const date = key.replace("entries_", ""); // YYYY-MM-DD
            // crude validation
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              allDates.push(date);
            }
          }
        }

        const months = Array.from(new Set(allDates.map((d) => d.slice(0, 7))))
          .sort()
          .reverse();

        const currentMonth = new Date().toISOString().slice(0, 7);
        if (!months.includes(currentMonth)) months.unshift(currentMonth);

        setAvailableMonths(months);
        if (months.length > 0) setSelectedMonth((m) => m || months[0]);
      } catch (error) {
        console.error(translate("Error:"), error);
      }
    };

    loadAvailableMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load monthly + daily totals for selected month
  useEffect(() => {
    if (!selectedMonth) return;

    const loadMonthlyData = () => {
      try {
        const monthlyTotals = {};
          const dailyTotals = {};

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith("entries_")) continue;

          const date = key.replace("entries_", ""); // YYYY-MM-DD
          if (!date.startsWith(selectedMonth)) continue;

          const raw = localStorage.getItem(key);
          if (!raw) continue;

          let entries = [];
          try {
            entries = JSON.parse(raw);
          } catch {
            continue;
          }

          let dailyTotal = 0;
          for (const entry of entries) {
            if (!monthlyTotals[entry.tag]) monthlyTotals[entry.tag] = 0;
            monthlyTotals[entry.tag] += Number(entry.value) || 0;
            dailyTotal += Number(entry.value) || 0;
          }
          dailyTotals[date] = dailyTotal;
        }

        setMonthlyData(monthlyTotals);

        const dailyDataArray = Object.entries(dailyTotals)
          .map(([date, value]) => ({ date, value }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        setDailyData(dailyDataArray);
      } catch (error) {
        console.error(translate("Error:"), error);
      }
    };

    loadMonthlyData();
  }, [selectedMonth, translate]);

  const totalAbs = useMemo(
    () =>
      Object.values(monthlyData).reduce((sum, val) => sum + Math.abs(val), 0),
    [monthlyData]
  );

  const monthLabel =
    selectedMonth &&
    new Date(selectedMonth + "-01").toLocaleDateString(navigator.language, {
      year: "numeric",
      month: "long",
    });

  return (
    <div
      className={`min-h-screen transition-colors duration-300 animate-fade-in ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900 to-slate-800"
          : "bg-gradient-to-br from-slate-50 to-indigo-50"
      }`}
    >
      {/* Header */}
      <header
        className={`shadow-lg border-b transition-colors duration-300 ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h1
                  className={`text-2xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  {translate("Monthly Overview")}
                </h1>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {translate("Analyze your spending patterns by month")}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>{translate("Back to Entries")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Daily Sales Chart */}
          {selectedMonth && (
            <DailySalesChart
              dailyData={dailyData}
              selectedMonth={selectedMonth}
            />
          )}

          <CustomSums
            monthlyData={monthlyData}
            availableTags={availableTags}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Month Selector Sidebar */}
            <div className="lg:col-span-1">
              <OverviewSidebar
                availableMonths={availableMonths}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            </div>

            {/* Monthly Summary */}
            <div className="lg:col-span-3">
              <MonthlySummary
                monthlyData={monthlyData}
                selectedMonth={selectedMonth}
                totalAbs={totalAbs}
                monthLabel={monthLabel}
                getTagIndicatorColor={getTagIndicatorColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
