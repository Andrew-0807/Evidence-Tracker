
import React from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from '../localization/LanguageContext';

const Header = ({ onShowOverview, onShowSearch }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, setLanguage, translate } = useLanguage();

  return (
    <header
      className={`shadow-lg border-b transition-colors duration-300 animate-fade-in ${
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
                aria-hidden="true"
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
                {translate("FlowTrack")}
              </h1>
              <p
                className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {translate("Track your daily activities and expenses")}
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
              title={isDarkMode ? translate("Switch to light mode") : translate("Switch to dark mode")}
              aria-label={isDarkMode ? translate("Switch to light mode") : translate("Switch to dark mode")}
            >
              {isDarkMode ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                  aria-hidden="true"
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
              onClick={() => setLanguage(language === 'en' ? 'ro' : 'en')}
              className={`p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center text-sm font-bold ${
                isDarkMode
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
              title={language === 'en' ? translate("Switch to Romanian") : translate("Switch to English")}
              aria-label={language === 'en' ? translate("Switch to Romanian") : translate("Switch to English")}
            >
              {language === 'en' ? 'RO' : 'EN'}
            </button>
            <button
              onClick={onShowSearch}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              title={translate("Search entries")}
              aria-label={translate("Search entries")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden sm:inline">{translate("Search")}</span>
            </button>
            <button
              onClick={() => onShowOverview(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              aria-label={translate("Overview")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>{translate("Overview")}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
