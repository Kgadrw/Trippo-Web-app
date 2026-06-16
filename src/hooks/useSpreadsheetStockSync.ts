import { useEffect } from "react";
import type { SpreadsheetRow } from "@/lib/spreadsheet";

interface StockEntity {
  stock?: number;
  minStock?: number;
}

/** Keep spreadsheet stock/minStock cells in sync when products change (e.g. after a sale). */
export function useSpreadsheetStockSync<T extends StockEntity>({
  enabled,
  entities,
  getEntityId,
  setSheetRows,
  markRowsSynced,
  onStockChanged,
}: {
  enabled: boolean;
  entities: T[];
  getEntityId: (entity: T) => string;
  setSheetRows: React.Dispatch<React.SetStateAction<SpreadsheetRow[]>>;
  markRowsSynced: (rows: SpreadsheetRow[]) => void;
  onStockChanged?: (entityId: string) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    setSheetRows((prev) => {
      if (prev.length === 0) return prev;

      const changedRows: SpreadsheetRow[] = [];
      const next = prev.map((row) => {
        if (!row._entityId) return row;
        const entity = entities.find((e) => getEntityId(e) === row._entityId);
        if (!entity) return row;

        const newStock = String(entity.stock ?? "");
        const newMinStock = String(entity.minStock ?? "");
        if (row.stock === newStock && row.minStock === newMinStock) return row;

        if (row.stock !== newStock && row._entityId) {
          onStockChanged?.(row._entityId);
        }

        const updated = { ...row, stock: newStock, minStock: newMinStock };
        changedRows.push(updated);
        return updated;
      });

      if (changedRows.length === 0) return prev;
      markRowsSynced(changedRows);
      return next;
    });
  }, [enabled, entities, getEntityId, setSheetRows, markRowsSynced, onStockChanged]);
}
