import { useCallback, useState } from "react";
import {
  createEmptySpreadsheetRow,
  isSpreadsheetRowEmpty,
  type SpreadsheetRow,
} from "@/lib/spreadsheet";

/** Add or focus the single draft row at the bottom. */
export function useAddSheetRow(
  setSheetRows: React.Dispatch<React.SetStateAction<SpreadsheetRow[]>>,
  columnKeys: readonly string[],
  buildRow?: (base: SpreadsheetRow) => SpreadsheetRow,
) {
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const addRow = useCallback(() => {
    setSheetRows((prev) => {
      const emptyDraft = prev.find(
        (r) => !r._entityId && isSpreadsheetRowEmpty(r, [...columnKeys]),
      );
      if (emptyDraft) {
        setFocusRowId(emptyDraft._rowId);
        return prev;
      }

      let row = createEmptySpreadsheetRow([...columnKeys]);
      if (buildRow) row = buildRow(row);

      const saved = prev.filter((r) => r._entityId);
      const inProgress = prev.filter(
        (r) => !r._entityId && !isSpreadsheetRowEmpty(r, [...columnKeys]),
      );
      setFocusRowId(row._rowId);
      return [...saved, ...inProgress, row];
    });
  }, [setSheetRows, columnKeys, buildRow]);

  const clearFocus = useCallback(() => setFocusRowId(null), []);

  return { focusRowId, setFocusRowId, addRow, clearFocus };
}
