/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import en from './en.json';
import ro from './ro.json';

const LanguageContext = createContext();

const translations = {
  en,
  ro,
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default language

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ro')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage
  const handleSetLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  const translate = (key, params = {}) => {
    let text = translations[language][key] || key;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
    }
    return text;
  };

  // Simple pluralization helper
  const translatePlural = (singularKey, pluralKey, count, params = {}) => {
    const chosenKey = count === 1 ? singularKey : pluralKey;
    return translate(chosenKey, { ...params, count });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, translate, translatePlural }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);