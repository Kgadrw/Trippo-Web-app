import { useEffect, useRef } from "react";

/** Initialize spreadsheet rows once per page visit — avoids reordering when API data updates. */
export function useSpreadsheetInit(
  enabled: boolean,
  isLoading: boolean,
  initSheet: () => void,
  resetKey?: string,
) {
  const bootstrappedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      bootstrappedRef.current = null;
      return;
    }
    if (isLoading) return;
    const key = resetKey ?? "default";
    if (bootstrappedRef.current === key) return;
    initSheet();
    bootstrappedRef.current = key;
  }, [enabled, isLoading, initSheet, resetKey]);
}
