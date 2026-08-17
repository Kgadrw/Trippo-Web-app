export const TEAM_DEPARTMENTS = [
  "general",
  "finance",
  "operations",
  "sales",
  "marketing",
  "hr",
] as const;

/** Built-in department keys; custom departments use arbitrary string keys from the API. */
export type TeamDepartment = string;

export const TEAM_TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TeamTaskStatus = (typeof TEAM_TASK_STATUSES)[number];

export const TEAM_PRIORITIES = ["low", "medium", "high"] as const;

export type TeamPriority = (typeof TEAM_PRIORITIES)[number];

/** Colored priority label so importance is obvious at a glance. */
export function teamPriorityClass(priority?: string | null) {
  switch (priority) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200";
    case "low":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200";
    case "medium":
    default:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200";
  }
}

export function teamPriorityBarClass(priority?: string | null) {
  switch (priority) {
    case "high":
      return "bg-red-500";
    case "low":
      return "bg-sky-500";
    case "medium":
    default:
      return "bg-amber-500";
  }
}

export function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
