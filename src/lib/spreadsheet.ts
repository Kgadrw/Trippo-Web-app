export type SpreadsheetCellValue = string;

export interface SpreadsheetColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  required?: boolean;
  width?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SpreadsheetRow {
  _rowId: string;
  _entityId?: string;
  [key: string]: SpreadsheetCellValue | undefined;
}

export function genSpreadsheetRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptySpreadsheetRow(keys: string[]): SpreadsheetRow {
  const row: SpreadsheetRow = { _rowId: genSpreadsheetRowId() };
  for (const key of keys) row[key] = "";
  return row;
}

export function isSpreadsheetRowEmpty(row: SpreadsheetRow, keys: string[]): boolean {
  return keys.every((key) => !String(row[key] ?? "").trim());
}

export function entitiesToSpreadsheetRows<T>(
  entities: T[],
  getId: (entity: T) => string,
  toCells: (entity: T) => Record<string, string>,
): SpreadsheetRow[] {
  return entities.map((entity) => ({
    _rowId: genSpreadsheetRowId(),
    _entityId: getId(entity),
    ...toCells(entity),
  }));
}

export function buildSpreadsheetRows<T>(
  entities: T[],
  getId: (entity: T) => string,
  toCells: (entity: T) => Record<string, string>,
  columnKeys: string[],
  emptyRowCount = 1,
): SpreadsheetRow[] {
  const existing = entitiesToSpreadsheetRows(entities, getId, toCells);
  const empty = Array.from({ length: emptyRowCount }, () => createEmptySpreadsheetRow(columnKeys));
  return [...existing, ...empty];
}

export function serializeSpreadsheetRow(row: SpreadsheetRow, keys: string[]): string {
  return keys.map((key) => String(row[key] ?? "").trim()).join("\t");
}

export function rowHasRequiredFields(row: SpreadsheetRow, requiredFields: string[]): boolean {
  return requiredFields.every((field) => String(row[field] ?? "").trim());
}

export function mergeEntityIdIntoRow(row: SpreadsheetRow, entityId: string): SpreadsheetRow {
  return { ...row, _entityId: entityId };
}

/** Keep exactly one blank row at the bottom for new entries. */
export function ensureTrailingEmptyRows(
  rows: SpreadsheetRow[],
  columnKeys: string[],
  _minEmpty = 1,
): SpreadsheetRow[] {
  const saved = rows.filter((r) => r._entityId);
  const drafts = rows.filter((r) => !r._entityId);
  const inProgress = drafts.filter((r) => !isSpreadsheetRowEmpty(r, columnKeys));
  const emptyDraft = drafts.find((r) => isSpreadsheetRowEmpty(r, columnKeys));
  const trailing = emptyDraft ?? createEmptySpreadsheetRow(columnKeys);
  return [...saved, ...inProgress, trailing];
}

export interface SpreadsheetRowSaveResult {
  entityId: string;
  created: boolean;
}

export async function saveSpreadsheetRow<TEntity>({
  row,
  requiredFields,
  columnKeys,
  findExisting,
  toPayload,
  add,
  update,
}: {
  row: SpreadsheetRow;
  requiredFields: string[];
  columnKeys: string[];
  findExisting: (entityId: string) => TEntity | undefined;
  toPayload: (row: SpreadsheetRow, existing?: TEntity) => TEntity | null;
  add: (payload: TEntity) => Promise<TEntity | void>;
  update: (payload: TEntity) => Promise<TEntity | void>;
}): Promise<SpreadsheetRowSaveResult> {
  if (isSpreadsheetRowEmpty(row, columnKeys)) {
    throw new Error("Empty row");
  }
  if (!rowHasRequiredFields(row, requiredFields)) {
    throw new Error(`Row missing: ${requiredFields.filter((f) => !String(row[f] ?? "").trim()).join(", ")}`);
  }

  const existing = row._entityId ? findExisting(row._entityId) : undefined;
  const payload = toPayload(row, existing);
  if (!payload) {
    throw new Error("Invalid row data");
  }

  if (existing) {
    const saved = await update(payload);
    const entityId =
      (saved as { _id?: string; id?: string | number } | undefined)?._id?.toString() ??
      (saved as { id?: string | number } | undefined)?.id?.toString() ??
      row._entityId ??
      "";
    return { entityId, created: false };
  }

  const saved = await add(payload);
  const entityId =
    (saved as { _id?: string; id?: string | number } | undefined)?._id?.toString() ??
    (saved as { id?: string | number } | undefined)?.id?.toString() ??
    "";
  if (!entityId) {
    throw new Error("Save failed — no id returned");
  }
  return { entityId, created: true };
}

export interface SpreadsheetSaveResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function saveSpreadsheetRows<TEntity>({
  rows,
  requiredFields,
  columnKeys,
  findExisting,
  toPayload,
  add,
  update,
}: {
  rows: SpreadsheetRow[];
  requiredFields: string[];
  columnKeys: string[];
  findExisting: (entityId: string) => TEntity | undefined;
  toPayload: (row: SpreadsheetRow, existing?: TEntity) => TEntity | null;
  add: (payload: TEntity) => Promise<void | TEntity>;
  update: (payload: TEntity) => Promise<void | TEntity>;
}): Promise<SpreadsheetSaveResult> {
  const result: SpreadsheetSaveResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (isSpreadsheetRowEmpty(row, columnKeys)) {
      result.skipped += 1;
      continue;
    }

    const missing = requiredFields.filter((field) => !String(row[field] ?? "").trim());
    if (missing.length > 0) {
      result.errors.push(`Row missing: ${missing.join(", ")}`);
      continue;
    }

    const existing = row._entityId ? findExisting(row._entityId) : undefined;
    const payload = toPayload(row, existing);
    if (!payload) {
      result.errors.push("Invalid row data");
      continue;
    }

    try {
      if (existing) {
        await update(payload);
        result.updated += 1;
      } else {
        await add(payload);
        result.created += 1;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Save failed";
      result.errors.push(message);
    }
  }

  return result;
}
