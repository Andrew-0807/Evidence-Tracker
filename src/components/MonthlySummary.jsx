import React from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "../localization/LanguageContext";

const MonthlySummary = ({
  monthlyData,
  selectedMonth,
  totalAbs,
  monthLabel,
  getTagIndicatorColor,
}) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  return (
    <div
      className={`rounded-xl shadow-md border overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`px-6 py-4 border-b transition-colors duration-300 ${
          isDarkMode
            ? "border-slate-700 bg-gradient-to-r from-slate-700 to-slate-600"
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div>
              <h3
                className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? "text-slate-100" : "text-slate-800"
                }`}
              >
                {selectedMonth
                  ? `${monthLabel} ${translate("Totals")}`
                  : translate("Select a Month")}
              </h3>
              {Object.keys(monthlyData).length > 0 && (
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {Object.keys(monthlyData).length} {translate("categories")} •{" "}
                  {translate("Total:")}{" "}
                  {Object.values(monthlyData)
                    .reduce((sum, val) => sum + val, 0)
                    .toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedMonth ? (
        Object.keys(monthlyData).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`border-b transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {translate("Category")}
                  </th>
                  <th
                    className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {translate("Amount")}
                  </th>
                  <th
                    className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {translate("Percentage")}
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? "divide-slate-700" : "divide-slate-200"
                }`}
              >
                {Object.entries(monthlyData)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .map(([tag, value]) => {
                    const percentage =
                      totalAbs > 0 ? (Math.abs(value) / totalAbs) * 100 : 0;

                    return (
                      <tr
                        key={tag}
                        className={`transition-colors duration-300 ${
                          isDarkMode
                            ? "hover:bg-slate-700"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${getTagIndicatorColor(
                                tag
                              )}`}
                            />
                            <span
                              className={`text-sm font-medium transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-slate-100"
                                  : "text-slate-900"
                              }`}
                            >
                              {tag}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-300 ${
                              value >= 0
                                ? isDarkMode
                                  ? "bg-green-900/30 text-green-300"
                                  : "bg-green-100 text-green-800"
                                : isDarkMode
                                ? "bg-red-900/30 text-red-300"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {Math.abs(value).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div
                              className={`w-16 rounded-full h-2 transition-colors duration-300 ${
                                isDarkMode
                                  ? "bg-slate-600"
                                  : "bg-slate-200"
                              }`}
                            >
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    percentage,
                                    100
                                  ).toFixed(1)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`text-sm w-12 text-right transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-slate-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
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
            <h3
              className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {translate("No data for this month")}
            </h3>
            <p
              className={`mt-1 text-sm transition-colors duration-300 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {translate("Add some entries to see spending analysis.")}
            </p>
          </div>
        )
      ) : (
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
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
          <h3
            className={`mt-2 text-sm font-medium transition-colors duration-300 ${
              isDarkMode ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {translate("Select a month")}
          </h3>
          <p
            className={`mt-1 text-sm transition-colors duration-300 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {translate("Choose a month from the sidebar to view spending totals.")}
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlySummary;