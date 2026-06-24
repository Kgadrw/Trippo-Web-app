import { useEffect, useRef } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SpreadsheetColumnDef, SpreadsheetRow } from "@/lib/spreadsheet";
import type { RowSaveStatus } from "@/hooks/useSpreadsheetAutoSave";

interface SpreadsheetEditorProps {
  columns: SpreadsheetColumnDef[];
  rows: SpreadsheetRow[];
  onRowsChange: (rows: SpreadsheetRow[], changedRowId?: string) => void;
  onAddRow: () => void;
  onSave?: () => void | Promise<void>;
  onRowBlur?: (rowId: string) => void;
  isSaving?: boolean;
  saveLabel?: string;
  addRowLabel: string;
  hint?: string;
  autoSave?: boolean;
  rowStatus?: Record<string, RowSaveStatus>;
  flashEntityIds?: Set<string>;
  flashFieldKey?: string;
  variant?: "spreadsheet" | "table";
  renderRowActions?: (row: SpreadsheetRow, index: number) => React.ReactNode;
  minWidth?: string;
  /** Row to highlight and scroll into view (e.g. after Add button). */
  focusRowId?: string | null;
  onFocusRowHandled?: () => void;
  /** Hide the bottom add-row button when toolbar has one. */
  hideAddButton?: boolean;
  newRowBadgeLabel?: string;
  onRowSave?: (rowId: string) => void;
  saveRowLabel?: string;
  onRowDelete?: (rowId: string) => void;
  deleteRowLabel?: string;
}

const cellInputClass =
  "h-9 w-full min-w-0 border-0 rounded-none px-2 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset shadow-none";

const tableCellInputClass =
  "h-9 w-full min-w-0 border border-gray-200 rounded-md px-2 text-sm bg-white hover:border-blue-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/30 shadow-none";

const draftTableCellInputClass =
  "h-9 w-full min-w-0 border-2 border-blue-400 rounded-md px-2 text-sm bg-white focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 shadow-sm placeholder:text-blue-400/80";

function draftRowClasses(isDraft: boolean, isFocused: boolean, isTable: boolean) {
  if (!isDraft) return "";
  if (isTable) {
    return cn(
      "bg-blue-50/90",
      isFocused
        ? "ring-2 ring-inset ring-blue-500 shadow-md outline outline-2 outline-blue-400/30"
        : "ring-1 ring-inset ring-blue-300",
    );
  }
  return cn(
    isFocused ? "bg-blue-100 ring-2 ring-inset ring-blue-500" : "bg-blue-50/90",
  );
}

function RowStatusDot({ status }: { status?: RowSaveStatus }) {
  if (!status || status === "idle") return null;
  if (status === "saving") {
    return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
  }
  if (status === "saved") {
    return <span className="block h-2 w-2 rounded-full bg-emerald-500" title="Saved" />;
  }
  if (status === "pending") {
    return <span className="block h-2 w-2 rounded-full bg-amber-400" title="Pending" />;
  }
  if (status === "error") {
    return <span className="block h-2 w-2 rounded-full bg-red-500" title="Save failed" />;
  }
  return null;
}

function CellEditor({
  col,
  row,
  onChange,
  onBlur,
  inputClass,
  isDraft,
  autoFocus,
  dataFirstCell,
}: {
  col: SpreadsheetColumnDef;
  row: SpreadsheetRow;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputClass: string;
  isDraft?: boolean;
  autoFocus?: boolean;
  dataFirstCell?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const className = isDraft ? draftTableCellInputClass : inputClass;
  const placeholder = isDraft
    ? col.placeholder || `Enter ${col.label.toLowerCase()}…`
    : col.placeholder;

  if (col.type === "select") {
    return (
      <select
        value={String(row[col.key] ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoFocus={autoFocus}
        data-first-cell={dataFirstCell ? "" : undefined}
        className={cn(className, "cursor-pointer")}
      >
        <option value="">{col.placeholder || `Select ${col.label.toLowerCase()}…`}</option>
        {col.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
      value={String(row[col.key] ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      min={col.type === "number" ? "0" : undefined}
      step={col.type === "number" ? "any" : undefined}
      autoFocus={autoFocus}
      data-first-cell={dataFirstCell ? "" : undefined}
    />
  );
}

function NewRowBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
      {label}
    </span>
  );
}

function RowActions({
  row,
  status,
  isDraft,
  onRowSave,
  saveRowLabel,
  renderExtra,
  onRemoveDraft,
  onDeleteSaved,
  deleteRowLabel,
}: {
  row: SpreadsheetRow;
  status?: RowSaveStatus;
  isDraft: boolean;
  onRowSave?: (rowId: string) => void;
  saveRowLabel: string;
  renderExtra?: React.ReactNode;
  onRemoveDraft?: () => void;
  onDeleteSaved?: () => void;
  deleteRowLabel: string;
}) {
  const showSave = onRowSave && (isDraft || status === "pending" || status === "error");
  const showDelete = isDraft ? Boolean(onRemoveDraft) : Boolean(onDeleteSaved);

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      <RowStatusDot status={status} />
      {showSave ? (
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-xs gap-1 bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 rounded-md"
          onClick={() => onRowSave!(row._rowId)}
          disabled={status === "saving"}
        >
          {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saveRowLabel}
        </Button>
      ) : null}
      {renderExtra}
      {showDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
          onClick={isDraft ? onRemoveDraft : onDeleteSaved}
          title={deleteRowLabel}
          disabled={status === "saving"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function SpreadsheetEditor({
  columns,
  rows,
  onRowsChange,
  onAddRow,
  onSave,
  onRowBlur,
  isSaving = false,
  saveLabel,
  addRowLabel,
  hint,
  autoSave = false,
  rowStatus = {},
  flashEntityIds,
  flashFieldKey,
  variant = "spreadsheet",
  renderRowActions,
  minWidth,
  focusRowId,
  onFocusRowHandled,
  hideAddButton = false,
  newRowBadgeLabel = "New",
  onRowSave,
  saveRowLabel = "Save",
  onRowDelete,
  deleteRowLabel = "Delete",
}: SpreadsheetEditorProps) {
  const isTable = variant === "table";
  const inputClass = isTable ? tableCellInputClass : cellInputClass;

  useEffect(() => {
    if (!focusRowId) return;
    const timer = window.setTimeout(() => {
      const rowEl = document.getElementById(`sheet-row-${focusRowId}`);
      rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      const first = rowEl?.querySelector<HTMLElement>("[data-first-cell]");
      first?.focus();
      onFocusRowHandled?.();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focusRowId, onFocusRowHandled]);

  const updateCell = (rowId: string, key: string, value: string) => {
    const next = rows.map((row) => (row._rowId === rowId ? { ...row, [key]: value } : row));
    onRowsChange(next, rowId);
  };

  const removeRow = (rowId: string) => {
    const row = rows.find((r) => r._rowId === rowId);
    if (!row || row._entityId) return;
    const otherDrafts = rows.filter((r) => !r._entityId && r._rowId !== rowId);
    if (otherDrafts.length === 0) {
      onRowsChange(
        rows.map((r) =>
          r._rowId === rowId
            ? { ...r, ...Object.fromEntries(columns.map((c) => [c.key, ""])) }
            : r,
        ),
        rowId,
      );
      return;
    }
    onRowsChange(rows.filter((r) => r._rowId !== rowId));
  };

  const showActions = Boolean(onRowSave || renderRowActions || onRowDelete);

  const renderAddButton = !hideAddButton ? (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9" onClick={onAddRow}>
      <Plus className="h-4 w-4" />
      {addRowLabel}
    </Button>
  ) : null;

  if (isTable) {
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className={cn("w-full border-collapse", minWidth)} style={minWidth ? { minWidth } : undefined}>
            <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left text-sm font-semibold text-gray-700 py-4 px-4 whitespace-nowrap"
                    style={{ width: col.width }}
                  >
                    {col.label}
                    {col.required ? <span className="text-red-500 ml-0.5">*</span> : null}
                  </th>
                ))}
                {showActions ? (
                  <th className="text-right text-sm font-semibold text-gray-700 py-4 px-4 whitespace-nowrap">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((row, index) => {
                const isDraft = !row._entityId;
                const isFocused = focusRowId === row._rowId;
                return (
                  <tr
                    key={row._rowId}
                    id={`sheet-row-${row._rowId}`}
                    className={cn(
                      "border-b border-gray-200 transition-all duration-200",
                      !isDraft && (index % 2 === 0 ? "bg-white" : "bg-gray-50"),
                      draftRowClasses(isDraft, isFocused, true),
                      rowStatus[row._rowId] === "error" && "bg-red-50/60",
                    )}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={cn(
                          "py-2 px-4 align-middle",
                          isDraft && colIndex === 0 && "relative",
                          flashFieldKey &&
                            col.key === flashFieldKey &&
                            row._entityId &&
                            flashEntityIds?.has(row._entityId) &&
                            "bg-amber-100 ring-2 ring-amber-400 ring-inset transition-colors duration-500",
                        )}
                      >
                        {isDraft && colIndex === 0 ? (
                          <div className="flex items-center gap-2 mb-1">
                            <NewRowBadge label={newRowBadgeLabel} />
                            <span className="text-xs text-blue-700 font-medium">Fill in this row</span>
                          </div>
                        ) : null}
                        <CellEditor
                          col={col}
                          row={row}
                          onChange={(value) => updateCell(row._rowId, col.key, value)}
                          onBlur={() => onRowBlur?.(row._rowId)}
                          inputClass={inputClass}
                          isDraft={isDraft && isTable}
                          autoFocus={isFocused && colIndex === 0}
                          dataFirstCell={colIndex === 0}
                        />
                      </td>
                    ))}
                    {showActions ? (
                      <td className="py-2 px-4 text-right align-middle whitespace-nowrap">
                        <RowActions
                          row={row}
                          status={rowStatus[row._rowId]}
                          isDraft={isDraft}
                          onRowSave={onRowSave}
                          saveRowLabel={saveRowLabel}
                          renderExtra={renderRowActions?.(row, index)}
                          onRemoveDraft={() => removeRow(row._rowId)}
                          onDeleteSaved={
                            !isDraft && onRowDelete ? () => onRowDelete(row._rowId) : undefined
                          }
                          deleteRowLabel={deleteRowLabel}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderAddButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div className="overflow-x-auto border border-gray-300 bg-white">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-0.5 py-2 text-[10px] font-semibold text-gray-500 w-7 min-w-[1.75rem] max-w-[1.75rem] text-center">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.label}
                  {col.required ? <span className="text-red-500 ml-0.5">*</span> : null}
                </th>
              ))}
              <th className="border border-gray-300 px-2 py-2 text-right text-xs font-semibold text-gray-700 w-28 min-w-[7rem]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isDraft = !row._entityId;
              const isFocused = focusRowId === row._rowId;
              return (
                <tr
                  key={row._rowId}
                  id={`sheet-row-${row._rowId}`}
                  className={cn(
                    "transition-all duration-200",
                    !isDraft && row._entityId && (index % 2 === 0 ? "bg-white" : "bg-gray-50/50"),
                    draftRowClasses(isDraft, isFocused, false),
                    rowStatus[row._rowId] === "error" && "bg-red-50/60",
                  )}
                >
                  <td className="border border-gray-300 px-0.5 py-0 text-center text-[10px] text-gray-500 tabular-nums w-7 min-w-[1.75rem] max-w-[1.75rem]">
                    <div className="flex flex-col items-center justify-center gap-0.5 py-1">
                      {isDraft ? <NewRowBadge label={newRowBadgeLabel} /> : <span>{index + 1}</span>}
                      {autoSave ? <RowStatusDot status={rowStatus[row._rowId]} /> : null}
                    </div>
                  </td>
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={cn(
                        "border border-gray-300 p-0 align-middle",
                        isDraft && "bg-blue-50/50",
                        flashFieldKey &&
                          col.key === flashFieldKey &&
                          row._entityId &&
                          flashEntityIds?.has(row._entityId) &&
                          "bg-amber-100 ring-2 ring-amber-400 ring-inset transition-colors duration-500",
                      )}
                    >
                      <CellEditor
                        col={col}
                        row={row}
                        onChange={(value) => updateCell(row._rowId, col.key, value)}
                        onBlur={() => onRowBlur?.(row._rowId)}
                        inputClass={isDraft ? draftTableCellInputClass : inputClass}
                        isDraft={isDraft}
                        autoFocus={isFocused && colIndex === 0}
                        dataFirstCell={colIndex === 0}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 p-1 text-right align-middle">
                    <RowActions
                      row={row}
                      status={rowStatus[row._rowId]}
                      isDraft={isDraft}
                      onRowSave={onRowSave}
                      saveRowLabel={saveRowLabel}
                      onRemoveDraft={() => removeRow(row._rowId)}
                      onDeleteSaved={
                        !isDraft && onRowDelete ? () => onRowDelete(row._rowId) : undefined
                      }
                      deleteRowLabel={deleteRowLabel}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {renderAddButton}
        {!autoSave && onSave && saveLabel ? (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 h-9 bg-sky-400 text-white hover:bg-sky-500 border border-sky-400"
            onClick={() => void onSave()}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saveLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
