import React from 'react';
import { useTheme } from './ThemeProvider';
import { useLanguage } from '../localization/LanguageContext';

const OverviewSidebar = ({ availableMonths, selectedMonth, setSelectedMonth }) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  return (
    <div
      className={`rounded-xl shadow-md border p-6 sticky top-8 transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center space-x-3 mb-6">
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
          {translate("Available Months")}
        </h3>
      </div>

      {availableMonths.length > 0 ? (
        <div className="space-y-2">
          {availableMonths.map((month) => {
            const isSelected = month === selectedMonth;
            const monthDate = new Date(month + "-01");
            const monthName = isNaN(monthDate.getTime())
              ? month
              : monthDate.toLocaleDateString(navigator.language, {
                  year: "numeric",
                  month: "long",
                });

            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                    : isDarkMode
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-slate-100"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{monthName}</span>
                  {isSelected && (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-8 w-8 text-slate-400"
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
          <p className="mt-2 text-sm text-slate-500">
            {translate("No months available")}
          </p>
        </div>
      )}
    </div>
  );
};

export default OverviewSidebar;