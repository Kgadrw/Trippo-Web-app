import { useCallback, useMemo, useState } from "react";

/**
 * Shared multi-select state for finance/sales tables (bulk delete).
 */
export function useTableSelection<T>(items: T[], getId: (item: T) => string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const itemIds = useMemo(() => items.map(getId).filter(Boolean), [items, getId]);

  const allSelected =
    itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const id of itemIds) {
      if (selectedIds.has(id)) count += 1;
    }
    return count;
  }, [itemIds, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(itemIds));
  }, [allSelected, itemIds]);

  const toggleSelectRow = useCallback((id: string) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId],
  );

  return {
    selectedIds,
    selectedCount,
    selectedItems,
    allSelected,
    toggleSelectAll,
    toggleSelectRow,
    clearSelection,
    setSelectedIds,
  };
}
