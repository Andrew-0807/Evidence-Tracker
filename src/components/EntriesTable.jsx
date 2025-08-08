import React, { useState, useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "../localization/LanguageContext";

const EntriesTable = ({
  isLoading,
  entries,
  selectedDate,
  availableTags,
  tableData,
  getTagColor,
  isLocked,
  totalAmount,
}) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Simple fuzzy search function
  const fuzzySearch = (query, text) => {
    if (!query) return true;
    if (!text) return false;
    
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    
    // Check for exact substring match
    if (lowerText.includes(lowerQuery)) return true;
    
    // Check for character sequence match (fuzzy)
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    
    return queryIndex === lowerQuery.length;
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    
    return entries.filter(entry => {
      const searchText = [
        entry.tag,
        entry.value.toString(),
        entry.description || ''
      ].join(' ');
      
      return fuzzySearch(searchQuery, searchText);
    });
  }, [entries, searchQuery]);

  return (
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
                {filteredEntries.length} {translate("entries")}
              </p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder={translate("Search entries...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg border text-sm transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            />
            <svg
              className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? "text-slate-400" : "text-slate-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                  isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
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
      ) : filteredEntries.length === 0 ? (
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
            {searchQuery ? translate("No entries found") : translate("No entries for this date")}
          </h3>
          <p
            className={`mt-1 text-sm transition-colors duration-300 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {searchQuery 
              ? translate("Try adjusting your search terms.")
              : translate("Add some entries to see the table.")}
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
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {translate("Category")}
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {translate("Amount")}
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {translate("Description")}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y transition-colors duration-300 ${
                isDarkMode ? "divide-slate-700" : "divide-slate-200"
              }`}
            >
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry.id || index}
                  className={`transition-colors duration-300 group ${
                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50"
                  }`}
                >
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(
                          entry.tag,
                        )}`}
                      >
                        {entry.tag}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    {entry.value.toFixed(2)}
                  </td>
                  <td
                    className={`px-6 py-4 text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    {entry.description || "-"}
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
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {translate("Total")}:
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  <span
                    className={`${
                      filteredEntries.reduce((sum, entry) => sum + entry.value, 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {filteredEntries.reduce((sum, entry) => sum + entry.value, 0).toFixed(2)}
                  </span>
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {filteredEntries.length} {translate("entries")}
                  {searchQuery && ` (${translate("filtered")})`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default EntriesTable;
