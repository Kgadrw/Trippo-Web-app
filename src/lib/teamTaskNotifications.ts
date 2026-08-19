import { adminApi, type TeamTaskRecord } from "@/lib/api";
import { notificationService } from "@/lib/notifications";
import { isIncompleteTaskOverdue } from "@/lib/taskDeadlines";
import { taskId } from "@/lib/teamTaskRealtime";

type TaskChangeKind = "updated" | "deleted";

function assigneeUserIds(task: TeamTaskRecord): string[] {
  const ids: string[] = [];
  if (task.assignees?.length) {
    for (const a of task.assignees) {
      if (typeof a === "object" && (a as any)?.linkedUserId) {
        ids.push(String((a as any).linkedUserId));
      }
    }
  }
  if (ids.length === 0 && typeof task.assigneeId === "object" && (task.assigneeId as any)?.linkedUserId) {
    ids.push(String((task.assigneeId as any).linkedUserId));
  }
  return ids;
}

function workspaceIdOf(task: TeamTaskRecord) {
  return task.workspaceId || localStorage.getItem("profit-pilot-active-workspace-id") || undefined;
}

function taskRoute(task: TeamTaskRecord) {
  return `/team/tasks?task=${encodeURIComponent(String(task._id))}`;
}

const OVERDUE_NOTIFIED_KEY = "profit-pilot-task-deadline-notified";

function loadNotifiedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(OVERDUE_NOTIFIED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedKeys(keys: Set<string>) {
  const trimmed = [...keys].slice(-250);
  localStorage.setItem(OVERDUE_NOTIFIED_KEY, JSON.stringify(trimmed));
}

/**
 * The task API performs the authorization; this separately targets the linked
 * workspace users so assignees are alerted when an admin changes their task.
 */
export async function notifyTaskAssigneeOfAdminChange(
  task: TeamTaskRecord,
  kind: TaskChangeKind,
): Promise<void> {
  const recipientIds = assigneeUserIds(task);
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  const targets = recipientIds.filter((id) => id !== currentUserId);
  if (targets.length === 0) return;

  const deleted = kind === "deleted";
  const workspaceId = workspaceIdOf(task);
  await Promise.all(
    targets.map((recipientUserId) =>
      adminApi.sendNotificationToUser(recipientUserId, {
        type: "task_assigned",
        title: deleted ? "A task assigned to you was deleted" : "A task assigned to you was updated",
        body: deleted
          ? `"${task.title}" was deleted by a workspace admin.`
          : `"${task.title}" was updated by a workspace admin.`,
        workspaceId,
        data: {
          taskId: task._id,
          workspaceId,
          action: kind,
          route: taskRoute(task),
          href: taskRoute(task),
          kind: "deadline",
        },
      }),
    ),
  );
}

/**
 * Alert the assignees once when a task (or its project) has passed the deadline
 * while still in To do or In progress.
 */
export async function notifyAssigneesOfOverdueTasks(
  tasks: TeamTaskRecord[],
  options?: {
    extraDeadlineForTask?: (task: TeamTaskRecord) => string | null | undefined;
    notifyOthers?: boolean;
  },
): Promise<void> {
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  if (!currentUserId || !tasks.length) return;

  const notified = loadNotifiedKeys();
  let changed = false;

  for (const task of tasks) {
    const extraDeadline = options?.extraDeadlineForTask?.(task) || null;
    if (!isIncompleteTaskOverdue(task, extraDeadline)) continue;

    const id = taskId(task);
    const dueKey = String(task.dueDate || extraDeadline || "").split("T")[0];
    const notifyKey = `${id}:${dueKey}`;
    if (notified.has(notifyKey)) continue;

    const recipientUserIds = assigneeUserIds(task);
    const workspaceId = workspaceIdOf(task);
    const href = taskRoute(task);
    const title = "Task deadline missed";
    const projectPassed =
      extraDeadline && isIncompleteTaskOverdue({ ...task, dueDate: undefined }, extraDeadline);
    const body = projectPassed
      ? `"${task.title}" is still open after the project deadline.`
      : `"${task.title}" has passed its deadline.`;

    try {
      const selfIds = recipientUserIds.filter((uid) => uid === currentUserId);
      const otherIds = recipientUserIds.filter((uid) => uid !== currentUserId);

      if (selfIds.length > 0) {
        await notificationService.showNotification("general", {
          title,
          body,
          tag: `task-overdue-${id}`,
          requireInteraction: true,
          data: {
            type: "reminder",
            kind: "deadline",
            taskId: id,
            workspaceId,
            route: href,
            href,
          },
        });
        notified.add(notifyKey);
        changed = true;
      }

      if (options?.notifyOthers && otherIds.length > 0) {
        await Promise.all(
          otherIds.map((recipientUserId) =>
            adminApi.sendNotificationToUser(recipientUserId, {
              type: "reminder",
              title,
              body,
              workspaceId,
              data: {
                type: "reminder",
                kind: "deadline",
                taskId: id,
                workspaceId,
                route: href,
                href,
              },
            }),
          ),
        );
        notified.add(notifyKey);
        changed = true;
      }
    } catch {
      // Keep trying later if the send fails.
    }
  }

  if (changed) saveNotifiedKeys(notified);
}
