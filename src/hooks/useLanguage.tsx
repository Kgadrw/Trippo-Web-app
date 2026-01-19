import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";

export type Language = "en" | "rw";

const LANGUAGE_STORAGE_KEY = "profit-pilot-language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Always default to English if no preference is saved
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored === "rw" || stored === "en") ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    // Dispatch event for components that need to react to language changes
    window.dispatchEvent(new Event("language-changed"));
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  useEffect(() => {
    // Listen for language changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as Language;
        if (newLang === "rw" || newLang === "en") {
          setLanguageState(newLang);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
