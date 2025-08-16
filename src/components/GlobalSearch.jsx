import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from './ThemeProvider';
import { useLanguage } from '../localization/LanguageContext';
import { useDebounce } from '../utils/hooks';

const GlobalSearch = ({ entries, onClose }) => {
  const { isDarkMode } = useTheme();
  const { translate, translatePlural } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Fuzzy search algorithm with scoring
  const fuzzySearch = (query, text) => {
    if (!query || !text) return { score: 0, matches: [] };

    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    let score = 0;
    let matches = [];

    // Exact match gets highest score
    if (lowerText.includes(lowerQuery)) {
      score += 100 + (lowerQuery.length * 20);
      const index = lowerText.indexOf(lowerQuery);
      matches.push({ start: index, end: index + query.length });
      return { score, matches };
    }

    // Character sequence match (fuzzy)
    let queryIndex = 0;
    const charMatches = [];

    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        charMatches.push({ start: i, end: i + 1 });
        queryIndex++;
      }
    }

    if (queryIndex === lowerQuery.length) {
      score += 50 + (lowerQuery.length * 10);
      matches = charMatches;
    }

    // Word boundary bonus
    const words = lowerText.split(' ');
    words.forEach((word) => {
      if (word.startsWith(lowerQuery)) {
        score += 20;
      }
    });

    return { score, matches };
  };

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];

    const results = entries.map(entry => {
      const searchableFields = {
        tag: { text: entry.tag, matches: [] },
        description: { text: entry.description || '', matches: [] },
        value: { text: entry.value.toString(), matches: [] },
        date: { text: entry.date || '', matches: [] }
      };

      let totalScore = 0;

      // Find matches in each field separately
      Object.keys(searchableFields).forEach(field => {
        const fieldData = searchableFields[field];
        const searchResult = fuzzySearch(debouncedSearchQuery, fieldData.text);
        fieldData.matches = searchResult.matches;
        totalScore += searchResult.score;
      });

      // Boost score for exact tag matches
      if (entry.tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        totalScore += 25;
      }

      return {
        ...entry,
        searchScore: totalScore,
        fieldMatches: searchableFields
      };
    })
    .filter(result => result.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 20); // Limit to top 20 results

    return results;
  }, [entries, debouncedSearchQuery]);

  // Show loading indicator while search is being processed
  const isSearching = searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedSearchQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleSelectResult(searchResults[selectedIndex]);
    }
  };

  const handleSelectResult = (result) => {
    // Navigate to the date of the selected entry
    if (result.date) {
      window.location.hash = `#date=${result.date}`;
    }
    onClose();
  };

  const highlightMatches = (text, matches) => {
    if (!matches || matches.length === 0) return text;

    let highlighted = [];
    let lastIndex = 0;

    matches.forEach(match => {
      if (match.start > lastIndex) {
        highlighted.push(
          <span key={`text-${lastIndex}`} className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
            {text.slice(lastIndex, match.start)}
          </span>
        );
      }
      highlighted.push(
        <span 
          key={`match-${match.start}`} 
          className="bg-indigo-500 text-white dark:bg-indigo-400 dark:text-white font-bold px-0.5 rounded-sm inline-block leading-tight"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {text.slice(match.start, match.end)}
        </span>
      );
      lastIndex = match.end;
    });

    if (lastIndex < text.length) {
      highlighted.push(
        <span key={`text-end`} className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return highlighted;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div 
        className={`relative w-full max-w-2xl mx-4 rounded-xl shadow-2xl transition-colors duration-300 ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        } border overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <svg 
              className={`w-5 h-5 ${
                isSearching 
                  ? "animate-pulse text-indigo-500 dark:text-indigo-400" 
                  : isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={translate("Search all entries...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`flex-1 bg-transparent outline-none text-lg ${
                isDarkMode ? 'text-slate-100 placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'
              }`}
            />
            <span className={`text-sm ${
              isSearching
                ? "text-indigo-500 dark:text-indigo-400"
                : isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {isSearching 
                 ? translate("Searching...")
                 : translatePlural("Found {{count}} result", "Found {{count}} results", searchResults.length, { count: searchResults.length })
               }
            </span>
          </div>
        </div>

        <div 
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
        >
          {searchResults.length === 0 && debouncedSearchQuery.trim() && !isSearching && (
            <div className="p-8 text-center">
              <svg className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {translate("No matching entries found")}
              </p>
            </div>
          )}

          {searchResults.map((result, index) => (
            <div
              key={`${result.id}-${index}`}
              className={`p-4 border-b cursor-pointer transition-colors duration-150 ${
                isDarkMode ? 'border-slate-700' : 'border-slate-200'
              } ${
                index === selectedIndex
                  ? isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
                  : isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
              }`}
              onClick={() => handleSelectResult(result)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      result.tag === 'Income' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' :
                      result.tag === 'Expense' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700' :
                      isDarkMode ? 'bg-slate-700 text-slate-200 border-slate-600' :
                      'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {result.fieldMatches.tag.matches.length > 0 
                      ? highlightMatches(result.tag, result.fieldMatches.tag.matches) 
                      : result.tag}
                  </span>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {result.fieldMatches.value.matches.length > 0 
                      ? highlightMatches(result.value.toFixed(2), result.fieldMatches.value.matches)
                      : result.value.toFixed(2)}
                  </span>
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatDate(result.date)}
                </span>
              </div>
              {result.description && (
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} leading-relaxed break-words`}>
                  {result.fieldMatches.description.matches.length > 0 
                    ? highlightMatches(result.description, result.fieldMatches.description.matches)
                    : result.description}
                </p>
              )}
              {!result.description && (
                <p className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {translate("No description")}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className={`p-3 text-xs border-t ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
            <div className="flex justify-between">
              <span>↑↓ to navigate • ↵ to select • ESC to close</span>
              <span>Search across {entries.length} entries</span>
            </div>
          </div>
      </div>
    </div>
  );
};

export default GlobalSearch;