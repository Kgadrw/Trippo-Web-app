import { adminApi, type TeamTaskRecord } from "@/lib/api";

type TaskChangeKind = "updated" | "deleted";

function assigneeUserId(task: TeamTaskRecord): string | null {
  if (typeof task.assigneeId !== "object" || !task.assigneeId?.linkedUserId) return null;
  return String(task.assigneeId.linkedUserId);
}

/**
 * The task API performs the authorization; this separately targets the linked
 * workspace user so the assignee is alerted when an admin changes their task.
 */
export async function notifyTaskAssigneeOfAdminChange(
  task: TeamTaskRecord,
  kind: TaskChangeKind,
): Promise<void> {
  const recipientUserId = assigneeUserId(task);
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  if (!recipientUserId || recipientUserId === currentUserId) return;

  const deleted = kind === "deleted";
  await adminApi.sendNotificationToUser(recipientUserId, {
    type: "task_assigned",
    title: deleted ? "A task assigned to you was deleted" : "A task assigned to you was updated",
    body: deleted
      ? `“${task.title}” was deleted by a workspace admin.`
      : `“${task.title}” was updated by a workspace admin.`,
    data: {
      taskId: task._id,
      action: kind,
      route: `/team/tasks?task=${encodeURIComponent(String(task._id))}`,
      href: `/team/tasks?task=${encodeURIComponent(String(task._id))}`,
      kind: "deadline",
    },
  });
}
