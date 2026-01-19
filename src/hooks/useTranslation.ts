import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "./useLanguage";
import { getTranslation, Translations } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();
  const [currentLanguage, setCurrentLanguage] = useState(language);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  useEffect(() => {
    const handleLanguageChange = () => {
      const stored = localStorage.getItem("profit-pilot-language");
      if (stored === "rw" || stored === "en") {
        setCurrentLanguage(stored);
      }
    };

    window.addEventListener("language-changed", handleLanguageChange);
    window.addEventListener("storage", handleLanguageChange);

    return () => {
      window.removeEventListener("language-changed", handleLanguageChange);
      window.removeEventListener("storage", handleLanguageChange);
    };
  }, []);

  const t = useCallback((key: keyof Translations): string => {
    return getTranslation(key, currentLanguage);
  }, [currentLanguage]);

  return { t, language: currentLanguage };
}
