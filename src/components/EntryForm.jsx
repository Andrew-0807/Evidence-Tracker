
import React from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "../localization/LanguageContext";

const EntryForm = ({
  selectedDate,
  setSelectedDate,
  isLocked,
  isAutoLocked,
  error,
  handleSubmit,
  selectedTag,
  setSelectedTag,
  availableTags,
  entryText,
  setEntryText,
  entryDescription,
  setEntryDescription,
}) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  return (
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
            {translate("Select Date")}
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
                  ? translate("This day is auto-locked (past date)")
                  : translate("This day is locked")}
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
            {translate("Add Entry")}
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
              {translate("Tag")}
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
              <option value="">{translate("Select Category")}...</option>
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
              {translate("Amount")}
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              placeholder={translate("Enter amount...")}
              disabled={isLocked}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 disabled:bg-slate-800"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-500 disabled:bg-slate-100"
              }`}
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {translate("Description (Optional)")}
            </label>
            <input
              type="text"
              id="description"
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              placeholder={translate("Add Note...")}
              disabled={isLocked}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed transition-colors duration-300 ${
                isDarkMode
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 disabled:bg-slate-800"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-500 disabled:bg-slate-100"
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isLocked || !selectedTag || !entryText.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
          >
            {translate("Add Entry")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EntryForm;
