import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useTheme } from "./ThemeProvider";
import { useStorage } from "./useStorage";
import { useLanguage } from "../localization/LanguageContext";

const Export = ({ entries, selectedDate, availableTags, tableData }) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();
  const [isExportingDaily, setIsExportingDaily] = useState(false);
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);

  const exportDailyToExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Daily Summary
      const dailySummaryData = [
        ["Daily Export"],
        [""],
        ["Export Date:", new Date().toLocaleDateString()],
        ["Selected Date:", selectedDate],
        ["Total Entries:", entries.length],
        [""],
        [translate("Category Breakdown:")],
        [translate("Category"), translate("Count"), translate("Total Amount")],
      ];

      availableTags.forEach((tag) => {
        const tagEntries = entries.filter((entry) => entry.tag === tag);
        const count = tagEntries.length;
        const total = tagEntries.reduce((sum, entry) => sum + entry.value, 0);
        dailySummaryData.push([tag, count, total.toFixed(2)]);
      });

      const dayTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
      dailySummaryData.push([""], [translate("Daily Total:"), "", dayTotal.toFixed(2)]);

      const dailySummaryWs = XLSX.utils.aoa_to_sheet(dailySummaryData);
      dailySummaryWs["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");

      // Sheet 2: Daily Entries Detail
      const dailyEntriesData = [[translate("Date"), translate("Category"), translate("Description"), translate("Amount")]];

      entries.forEach((entry) => {
        dailyEntriesData.push([
          entry.date,
          entry.tag,
          entry.description || "",
          entry.value ? entry.value.toFixed(2) : "",
        ]);
      });

      const dailyEntriesWs = XLSX.utils.aoa_to_sheet(dailyEntriesData);
      dailyEntriesWs["!cols"] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, dailyEntriesWs, "Daily Entries");

      // Sheet 3: Category Grid Layout
      const gridData = [];
      gridData.push([`${translate("Category")} ${translate("Grid")} - ${selectedDate}`]);
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
      const fileName = `FlowTrack_Daily_${selectedDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(
        `${translate("Daily Excel file")} "${fileName}" ${translate("has been downloaded with 3 sheets:")}
• ${translate("Daily Summary - Overview and category breakdown for")} ${selectedDate}
• ${translate("Daily Entries - All entries for the day")}
• ${translate("Category Grid - Grid layout view")}`,
      );
    } catch (error) {
      console.error("Failed to export daily Excel:", error);
      alert("Failed to export daily Excel file: " + error.message);
    }
  };

  const exportMonthlyToExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Get all entries for the selected month
      const selectedMonth = selectedDate.substring(0, 7); // YYYY-MM format
      const monthlyEntries = await useStorage.getMonthlyEntries(selectedMonth);

      // Sheet 1: Summary Overview
      const summaryData = [
        [`${translate("FlowTrack")} ${translate("Export Summary")}`],
        [""],
        [translate("Export Date:"), new Date().toLocaleDateString()],
        [translate("Selected Month:"), selectedMonth],
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
          translate("Grand Total:"),
          "",
          monthlyEntries
            .reduce((sum, entry) => sum + entry.value, 0)
            .toFixed(2),
        ],
      );

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Sheet 2: Detailed Entries List
      const detailsData = [
        [translate("Date"), translate("Time"), translate("Category"), translate("Amount"), translate("Description")],
      ];

      monthlyEntries.forEach((entry) => {
        detailsData.push([
          entry.date,
          "00:00:00", // Placeholder for time, as it's not stored in the backend
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
        [`${translate("Monthly Analysis -")} ${selectedMonth}`],
        [""],
        [translate("Date"), ...availableTags, translate("Daily Total")],
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
        const monthlyTotals = [translate("Monthly Total")];
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

      // Sheet 4: Daily Sales Graph Data with Chart
      const graphData = [
        [`${translate("Daily Sales Graph Data -")} ${selectedMonth}`],
        [""],
        [translate("Date"), translate("Daily Total Sales")],
      ];

      // Add daily sales data sorted by date
      const dailySalesData = [];
      const sortedDates = Object.keys(entriesByDate).sort();
      
      sortedDates.forEach((date) => {
        const dayData = entriesByDate[date];
        const dailyTotal = availableTags.reduce(
          (sum, tag) => sum + (dayData[tag] || 0),
          0,
        );
        dailySalesData.push([date, dailyTotal]);
      });

      // Add the daily sales data to graph sheet
      graphData.push(...dailySalesData);
      
      // Add empty row and summary statistics
      if (dailySalesData.length > 0) {
        graphData.push([""], [translate("Summary Statistics")]);
        const totals = dailySalesData.map(row => row[1]);
        const avgSales = totals.reduce((sum, val) => sum + val, 0) / totals.length;
        const maxSales = Math.max(...totals);
        const minSales = Math.min(...totals);
        
        graphData.push(
          [translate("Average Daily Sales:"), avgSales.toFixed(2)],
          [translate("Maximum Daily Sales:"), maxSales.toFixed(2)],
          [translate("Minimum Daily Sales:"), minSales.toFixed(2)],
          [translate("Total Days:"), dailySalesData.length]
        );
      }

      const graphWs = XLSX.utils.aoa_to_sheet(graphData);
      graphWs["!cols"] = [{ wch: 15 }, { wch: 18 }];
      
      // Add basic formatting to headers
      if (graphWs["A3"]) graphWs["A3"].s = { font: { bold: true } };
      if (graphWs["B3"]) graphWs["B3"].s = { font: { bold: true } };
      
      XLSX.utils.book_append_sheet(wb, graphWs, "Daily Sales Graph");

      // Sheet 5: Category Grid Layout (Current Day View)
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
      const fileName = `FlowTrack_Export_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(
        translate("Monthly Excel file") + ` "${fileName}" ` + translate("has been downloaded with 5 sheets:") + `
• ` + translate("Summary") + ` - ` + translate("Overview and category breakdown for") + ` ${selectedMonth}
• ` + translate("Detailed Entries") + ` - ` + translate("All entries for the month") + `
• ` + translate("Monthly Analysis") + ` - ` + translate("Daily breakdown and monthly totals") + `
• ` + translate("Daily Sales Graph") + ` - ` + translate("Date vs daily total sales data") + `
• ` + translate("Category Grid") + ` - ` + translate("Current day view") + ` (${selectedDate})`
      );
    } catch (error) {
      console.error("Failed to export monthly Excel:", error);
      alert("Failed to export monthly Excel file: " + error.message);
    }
  };

  return (
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

      <div className="grid grid-cols-2 gap-3">
        {/* Daily Export Button */}
        <button
          onClick={async () => {
            try {
              setIsExportingDaily(true);
              await exportDailyToExcel();
            } catch (error) {
              console.error("Daily export failed:", error);
              alert("Daily export failed: " + error.message);
            } finally {
              setIsExportingDaily(false);
            }
          }}
          disabled={entries.length === 0 || isExportingDaily}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isExportingDaily ? (
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
              <span>{translate("Exporting Daily...")}</span>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{translate("Export Daily")}</span>
            </>
          )}
        </button>

        {/* Monthly Export Button */}
        <button
          onClick={async () => {
            try {
              setIsExportingMonthly(true);
              await exportMonthlyToExcel();
            } catch (error) {
              console.error("Monthly export failed:", error);
              alert("Monthly export failed: " + error.message);
            } finally {
              setIsExportingMonthly(false);
            }
          }}
          disabled={isExportingMonthly}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isExportingMonthly ? (
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
              <span>{translate("Exporting Monthly...")}</span>
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
              <span>{translate("Export Monthly")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Export;
