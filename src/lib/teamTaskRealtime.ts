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
    projectFilter: string;
  },
): boolean {
  if (filters.department && task.department !== filters.department) return false;
  if (filters.monthKey && task.monthKey !== filters.monthKey) return false;
  if (filters.statusFilter !== "all" && task.status !== filters.statusFilter) return false;

  if (filters.assigneeFilter !== "all") {
    const ids = new Set<string>();
    if (task.assignees?.length) {
      for (const a of task.assignees) {
        ids.add(typeof a === "object" && a?._id ? String(a._id) : String(a));
      }
    }
    if (typeof task.assigneeId === "object" && task.assigneeId?._id) {
      ids.add(String(task.assigneeId._id));
    } else if (task.assigneeId) {
      ids.add(String(task.assigneeId));
    }
    if (!ids.has(filters.assigneeFilter)) return false;
  }

  if (filters.projectFilter && filters.projectFilter !== "all") {
    const projectId =
      typeof task.projectId === "object" && task.projectId
        ? String(task.projectId._id || "")
        : String(task.projectId || "");
    if (filters.projectFilter === "none") {
      if (projectId) return false;
    } else if (projectId !== filters.projectFilter) {
      return false;
    }
  }

  return true;
}

export function mergeTaskRecord(prev: TeamTaskRecord, incoming: TeamTaskRecord): TeamTaskRecord {
  return {
    ...prev,
    ...incoming,
    subtasks: Array.isArray(incoming.subtasks) ? incoming.subtasks : prev.subtasks,
  };
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
    return prev.map((row) => (taskId(row) === id ? mergeTaskRecord(row, task) : row));
  }
  return [task, ...prev];
}
