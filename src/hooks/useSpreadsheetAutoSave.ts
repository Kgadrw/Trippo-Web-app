import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureTrailingEmptyRows,
  isSpreadsheetRowEmpty,
  mergeEntityIdIntoRow,
  rowHasRequiredFields,
  saveSpreadsheetRow,
  serializeSpreadsheetRow,
  type SpreadsheetRow,
} from "@/lib/spreadsheet";

export type RowSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseSpreadsheetAutoSaveOptions<TEntity> {
  sheetRows: SpreadsheetRow[];
  setSheetRows: React.Dispatch<React.SetStateAction<SpreadsheetRow[]>>;
  columnKeys: string[];
  requiredFields: string[];
  findExisting: (entityId: string) => TEntity | undefined;
  toPayload: (row: SpreadsheetRow, existing?: TEntity) => TEntity | null;
  add: (payload: TEntity) => Promise<TEntity | void>;
  update: (payload: TEntity) => Promise<TEntity | void>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useSpreadsheetAutoSave<TEntity>({
  sheetRows,
  setSheetRows,
  columnKeys,
  requiredFields,
  findExisting,
  toPayload,
  add,
  update,
  enabled = true,
  debounceMs = 700,
}: UseSpreadsheetAutoSaveOptions<TEntity>) {
  const [rowStatus, setRowStatus] = useState<Record<string, RowSaveStatus>>({});
  const savedSnapshotRef = useRef<Map<string, string>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const savingRef = useRef<Set<string>>(new Set());

  const persistRow = useCallback(
    async (row: SpreadsheetRow) => {
      if (!enabled) return;
      if (isSpreadsheetRowEmpty(row, columnKeys)) return;
      if (!rowHasRequiredFields(row, requiredFields)) return;

      const snapshot = serializeSpreadsheetRow(row, columnKeys);
      if (savedSnapshotRef.current.get(row._rowId) === snapshot) return;
      if (savingRef.current.has(row._rowId)) return;

      savingRef.current.add(row._rowId);
      setRowStatus((prev) => ({ ...prev, [row._rowId]: "saving" }));

      try {
        const result = await saveSpreadsheetRow({
          row,
          requiredFields,
          columnKeys,
          findExisting,
          toPayload,
          add,
          update,
        });

        savedSnapshotRef.current.set(row._rowId, snapshot);
        setRowStatus((prev) => ({ ...prev, [row._rowId]: "saved" }));

        setSheetRows((prev) => {
          const next = prev.map((r) =>
            r._rowId === row._rowId ? mergeEntityIdIntoRow(r, result.entityId) : r,
          );
          return ensureTrailingEmptyRows(next, columnKeys);
        });
      } catch {
        setRowStatus((prev) => ({ ...prev, [row._rowId]: "error" }));
      } finally {
        savingRef.current.delete(row._rowId);
      }
    },
    [
      enabled,
      columnKeys,
      requiredFields,
      findExisting,
      toPayload,
      add,
      update,
      setSheetRows,
    ],
  );

  const scheduleRowSave = useCallback(
    (rowId: string, rows: SpreadsheetRow[]) => {
      if (!enabled) return;
      const row = rows.find((r) => r._rowId === rowId);
      if (!row) return;

      if (isSpreadsheetRowEmpty(row, columnKeys)) {
        setRowStatus((prev) => {
          const next = { ...prev };
          delete next[rowId];
          return next;
        });
        return;
      }

      if (!rowHasRequiredFields(row, requiredFields)) {
        setRowStatus((prev) => ({ ...prev, [rowId]: "pending" }));
      } else {
        setRowStatus((prev) => ({ ...prev, [rowId]: "pending" }));
      }

      const existing = timersRef.current.get(rowId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timersRef.current.delete(rowId);
        const latest = rows.find((r) => r._rowId === rowId);
        if (latest) void persistRow(latest);
      }, debounceMs);

      timersRef.current.set(rowId, timer);
    },
    [enabled, columnKeys, requiredFields, debounceMs, persistRow],
  );

  const onRowsChange = useCallback(
    (rows: SpreadsheetRow[], changedRowId?: string) => {
      setSheetRows(rows);
      if (changedRowId) scheduleRowSave(changedRowId, rows);
    },
    [setSheetRows, scheduleRowSave],
  );

  const onRowBlur = useCallback(
    (rowId: string, rows: SpreadsheetRow[]) => {
      const existing = timersRef.current.get(rowId);
      if (existing) {
        clearTimeout(existing);
        timersRef.current.delete(rowId);
      }
      const row = rows.find((r) => r._rowId === rowId);
      if (row) void persistRow(row);
    },
    [persistRow],
  );

  const saveRowNow = useCallback(
    (rowId: string, rows?: SpreadsheetRow[]) => {
      const list = rows ?? sheetRows;
      const row = list.find((r) => r._rowId === rowId);
      if (!row) return;
      const existing = timersRef.current.get(rowId);
      if (existing) {
        clearTimeout(existing);
        timersRef.current.delete(rowId);
      }
      void persistRow(row);
    },
    [sheetRows, persistRow],
  );

  const markRowsSynced = useCallback(
    (rows: SpreadsheetRow[]) => {
      for (const row of rows) {
        savedSnapshotRef.current.set(row._rowId, serializeSpreadsheetRow(row, columnKeys));
        setRowStatus((prev) => ({ ...prev, [row._rowId]: "saved" }));
      }
    },
    [columnKeys],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return { rowStatus, onRowsChange, onRowBlur, markRowsSynced, saveRowNow };
}
