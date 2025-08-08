
import React from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from '../localization/LanguageContext';

const TagManager = ({
  showTagManager,
  setShowTagManager,
  availableTags,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  error,
}) => {
  const { isDarkMode } = useTheme();
  const { translate } = useLanguage();

  if (!showTagManager) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`rounded-xl shadow-lg border p-6 w-full max-w-md mx-4 transition-colors duration-300 ${
          isDarkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`text-xl font-semibold ${
              isDarkMode ? "text-slate-100" : "text-slate-800"
            }`}
          >
            {translate("Manage Tags")}
          </h2>
          <button
            onClick={() => setShowTagManager(false)}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:bg-slate-700"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className={`mb-4 p-3 border rounded-lg ${
              isDarkMode
                ? "bg-red-900/20 border-red-800 text-red-400"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {translate(error)}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="newTag"
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {translate("Add New Tag")}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="newTag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={translate("Enter new tag name...")}
                className={`flex-grow px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-100"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
              <button
                onClick={handleAddTag}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                {translate("Add")}
              </button>
            </div>
          </div>

          <div>
            <h3
              className={`text-lg font-medium mb-2 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {translate("Existing Tags")}
            </h3>
            <ul
              className={`space-y-2 p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-slate-900/50 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {availableTags.map((tag) => (
                <li
                  key={tag}
                  className="flex items-center justify-between p-2 rounded-md"
                >
                  <span
                    className={`font-medium ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {tag}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-red-500 hover:text-red-700"
                  >
                    {translate("Remove")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
