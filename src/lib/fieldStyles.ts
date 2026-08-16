/** Full visible border + ring (active/focused look) for filter bar fields */
export const activeFieldClass =
  "border-gray-500 ring-2 ring-gray-300/50 dark:border-sky-500/50 dark:ring-sky-500/25";

export const searchBarInputClass = `pl-9 h-10 w-full min-w-0 ${activeFieldClass}`;

/** Borderless date/month/time pickers — used app-wide */
export const dateInputClass =
  "h-9 w-auto min-w-[10rem] border-0 bg-transparent px-1 shadow-none text-foreground focus-visible:border-0 focus-visible:ring-0";

/** Borderless toolbar filters, month pickers, and plain selects — used app-wide */
export const plainSelectTriggerClass =
  "plain-select-trigger h-9 w-auto min-w-[9rem] border-0 bg-transparent px-1 shadow-none text-foreground focus:border-0 focus:ring-0";

export const filterSelectClass = plainSelectTriggerClass;

/** @deprecated Use filterSelectClass */
export const dateSelectTriggerClass = plainSelectTriggerClass;

export const filterDateInputClass =
  "pl-9 h-10 w-full text-base border-0 bg-transparent shadow-none text-foreground focus-visible:border-0 focus-visible:ring-0";

/** Mobile list pages — matches Sales search + filter toggle */
export const mobileFilterToggleClass =
  "bg-card/90 backdrop-blur-sm border border-input text-foreground " +
  "hover:bg-sky-50 hover:border-sky-300 hover:text-sky-800 " +
  "dark:bg-muted dark:border-transparent dark:text-foreground " +
  "dark:hover:bg-sky-500/20 dark:hover:border-sky-500/40 dark:hover:text-sky-200 " +
  "rounded-lg px-3 py-2";

export const mobileFilterToggleActiveClass =
  "bg-sky-50 border-sky-300 text-sky-800 " +
  "dark:bg-sky-500/25 dark:border-sky-500/40 dark:text-sky-100";

export const mobileFilterPanelClass =
  "rounded-lg p-4 bg-card/90 backdrop-blur-sm border border-transparent space-y-3 " +
  "dark:bg-muted/80";

/** Period toggles — matches dashboard sales trend chart (blue active, not yellow accent) */
export const periodToggleClass =
  "text-xs px-2.5 h-8 font-medium rounded-lg border border-transparent bg-transparent text-foreground " +
  "hover:!bg-sky-50 hover:!text-sky-700 hover:border-sky-200 " +
  "data-[state=on]:bg-sky-50 data-[state=on]:text-sky-700 data-[state=on]:border-sky-200 " +
  "data-[state=on]:hover:!bg-sky-100 data-[state=on]:hover:!text-sky-800 " +
  "dark:text-foreground dark:hover:!bg-sky-500/20 dark:hover:!text-sky-100 dark:hover:border-sky-500/30 " +
  "dark:data-[state=on]:bg-sky-500/25 dark:data-[state=on]:text-sky-100 dark:data-[state=on]:border-sky-500/40 " +
  "dark:data-[state=on]:hover:!bg-sky-500/35 dark:data-[state=on]:hover:!text-white";
