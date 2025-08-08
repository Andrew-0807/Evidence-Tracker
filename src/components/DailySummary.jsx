
import React from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from '../localization/LanguageContext';

const DailySummary = ({
  isLocked,
  entries,
  handleLockDay,
  totalAmount,
  availableTags,
}) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  return (
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
          {translate("Daily Summary")}
        </h3>
        {!isLocked && entries.length > 0 && (
          <button
            onClick={handleLockDay}
            className="ml-auto bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm"
          >
            {translate("Lock Day")}
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
            {translate("Total:")}
          </span>
          <span
            className={`font-bold ${
              totalAmount >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {Math.abs(totalAmount).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span
            className={`text-sm transition-colors duration-300 ${
              isDarkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {translate("Entries Today:")}
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
            {translate("Available Tags:")}
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
  );
};

export default DailySummary;
