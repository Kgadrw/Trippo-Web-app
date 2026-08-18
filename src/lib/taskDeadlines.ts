import type { TeamTaskRecord } from "@/lib/api";
import { getWorkspaceScopeKey } from "@/lib/workspace";
import { taskId } from "@/lib/teamTaskRealtime";

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function parseTaskDay(value?: string | null): Date | null {
  if (!value) return null;
  const day = String(value).split("T")[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const local = new Date(year, month - 1, date);
  return Number.isNaN(local.getTime()) ? null : local;
}

/** True when the calendar day is before today (deadline has passed). */
export function isDeadlinePassed(value?: string | null): boolean {
  const due = parseTaskDay(value);
  if (!due) return false;
  return startOfLocalDay(due) < startOfLocalDay(new Date());
}

export function isIncompleteTaskOverdue(
  task: Pick<TeamTaskRecord, "status" | "dueDate">,
  extraDeadline?: string | null,
): boolean {
  if ((task.status || "todo") === "done") return false;
  return isDeadlinePassed(task.dueDate) || isDeadlinePassed(extraDeadline);
}

const HIDDEN_PREFIX = "profit-pilot-hidden-completed-tasks:";

export function hiddenCompletedStorageKey(boardKey: string) {
  return `${HIDDEN_PREFIX}${getWorkspaceScopeKey()}:${boardKey}`;
}

export function loadHiddenCompletedTaskIds(boardKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(hiddenCompletedStorageKey(boardKey));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function saveHiddenCompletedTaskIds(boardKey: string, ids: Set<string>) {
  const key = hiddenCompletedStorageKey(boardKey);
  if (ids.size === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export function areAllOpenTasksComplete(tasks: TeamTaskRecord[]): boolean {
  return tasks.length > 0 && tasks.every((task) => (task.status || "todo") === "done");
}

export function filterHiddenCompletedTasks(
  tasks: TeamTaskRecord[],
  hiddenIds: Set<string>,
): TeamTaskRecord[] {
  if (hiddenIds.size === 0) return tasks;
  return tasks.filter((task) => {
    if ((task.status || "todo") !== "done") return true;
    return !hiddenIds.has(taskId(task));
  });
}
