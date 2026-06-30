import type { TeamTaskRecord } from "@/lib/api";
import type { TeamDepartment } from "@/lib/teamConstants";

export const TEAM_TASK_EVENTS = {
  created: "team-task:created",
  updated: "team-task:updated",
  deleted: "team-task:deleted",
} as const;

export function taskId(task: TeamTaskRecord) {
  return String(task._id);
}

export function taskMatchesListFilters(
  task: TeamTaskRecord,
  filters: {
    monthKey: string;
    department?: TeamDepartment;
    statusFilter: string;
    assigneeFilter: string;
  },
): boolean {
  if (filters.department && task.department !== filters.department) return false;
  if (filters.monthKey && task.monthKey !== filters.monthKey) return false;
  if (filters.statusFilter !== "all" && task.status !== filters.statusFilter) return false;

  const assigneeId =
    typeof task.assigneeId === "object" && task.assigneeId
      ? String(task.assigneeId._id)
      : String(task.assigneeId);
  if (filters.assigneeFilter !== "all" && assigneeId !== filters.assigneeFilter) return false;

  return true;
}

export function mergeTaskIntoList(
  prev: TeamTaskRecord[],
  task: TeamTaskRecord,
  matches: boolean,
): TeamTaskRecord[] {
  const id = taskId(task);
  const exists = prev.some((row) => taskId(row) === id);

  if (!matches) {
    return exists ? prev.filter((row) => taskId(row) !== id) : prev;
  }
  if (exists) {
    return prev.map((row) => (taskId(row) === id ? task : row));
  }
  return [task, ...prev];
}
