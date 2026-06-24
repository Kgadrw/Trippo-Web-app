/** Full visible border + ring (active/focused look) for filter bar fields */
export const activeFieldClass = "border-gray-500 ring-2 ring-gray-300/50";

export const searchBarInputClass = `pl-9 h-10 w-full min-w-0 ${activeFieldClass}`;

/** Borderless date/month/time pickers — used app-wide */
export const dateInputClass =
  "h-9 w-auto min-w-[10rem] border-0 bg-transparent px-1 shadow-none focus-visible:border-0 focus-visible:ring-0";

/** Borderless toolbar filters, month pickers, and plain selects — used app-wide */
export const plainSelectTriggerClass =
  "plain-select-trigger h-9 w-auto min-w-[9rem] border-0 bg-transparent px-1 shadow-none focus:border-0 focus:ring-0";

export const filterSelectClass = plainSelectTriggerClass;

/** @deprecated Use filterSelectClass */
export const dateSelectTriggerClass = plainSelectTriggerClass;

export const filterDateInputClass =
  "pl-9 h-10 w-full text-base border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0";

/** Mobile list pages — matches Sales search + filter toggle */
export const mobileFilterToggleClass =
  "bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-lg px-3 py-2";

export const mobileFilterToggleActiveClass =
  "bg-blue-50 border-blue-300 text-blue-700";

export const mobileFilterPanelClass =
  "rounded-lg p-4 bg-white/80 backdrop-blur-sm border border-gray-200 space-y-3";

/** Period toggles — matches dashboard sales trend chart (blue active, not yellow accent) */
export const periodToggleClass =
  "text-xs px-2.5 h-8 font-medium rounded-lg border border-gray-200 bg-transparent text-gray-700 " +
  "hover:!bg-blue-50 hover:!text-blue-600 hover:border-blue-200 " +
  "data-[state=on]:bg-blue-50 data-[state=on]:text-blue-600 data-[state=on]:border-blue-200 " +
  "data-[state=on]:hover:!bg-blue-100 data-[state=on]:hover:!text-blue-700";
