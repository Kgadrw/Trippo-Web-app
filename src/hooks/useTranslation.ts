import { useCallback } from "react";
import { getTranslation, type Translations } from "@/lib/translations";

export function useTranslation() {
  const t = useCallback((key: keyof Translations): string => {
    return getTranslation(key);
  }, []);

  return { t, language: "en" as const };
}
