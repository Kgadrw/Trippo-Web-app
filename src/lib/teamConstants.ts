export const TEAM_DEPARTMENTS = [
  "general",
  "finance",
  "operations",
  "sales",
  "marketing",
  "hr",
] as const;

export type TeamDepartment = (typeof TEAM_DEPARTMENTS)[number];

export const TEAM_TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TeamTaskStatus = (typeof TEAM_TASK_STATUSES)[number];

export const TEAM_PRIORITIES = ["low", "medium", "high"] as const;

export type TeamPriority = (typeof TEAM_PRIORITIES)[number];

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
