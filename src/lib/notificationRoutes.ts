import { WORKSPACE_GROUP_CHAT_PATH } from "@/lib/workspaceGroupChat";

type NotificationLike = {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown> | null;
};

function asId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id != null) return String(obj._id);
    if (obj.id != null) return String(obj.id);
  }
  return String(value);
}

function firstId(...values: unknown[]): string {
  for (const value of values) {
    const id = asId(value);
    if (id) return id;
  }
  return "";
}

function firstPath(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const path = value.trim();
    if (path.startsWith("/")) return path;
  }
  return "";
}

function appendQuery(path: string, key: string, value: string): string {
  if (!value) return path;
  try {
    const url = new URL(path, "https://trippo.local");
    if (!url.searchParams.get(key)) url.searchParams.set(key, value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const joiner = path.includes("?") ? "&" : "?";
    return `${path}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

/**
 * Map a stored / push notification to an in-app route so the bell and OS
 * notifications can open the matching page (and item) directly.
 */
export function resolveNotificationHref(notification: NotificationLike): string {
  const data = (notification.data || {}) as Record<string, unknown>;
  const type = String(notification.type || data.type || "").toLowerCase();
  const kind = String(data.kind || data.source || data.entityType || data.resource || "").toLowerCase();
  const title = `${notification.title || ""} ${notification.body || ""}`.toLowerCase();

  const eventId = firstId(data.eventId, data.calendarEventId, data.event_id);
  const taskId = firstId(data.taskId, data.teamTaskId, data.task_id);
  const scheduleId = firstId(data.scheduleId, data.schedule_id);
  const projectId = firstId(data.projectId, data.project_id);
  const documentId = firstId(data.documentId, data.document_id);
  const leaveId = firstId(data.leaveId, data.leaveRequestId);
  const otherUserId = firstId(data.otherUserId, data.senderUserId);
  const workspaceId = firstId(data.workspaceId);
  const inviteToken = firstId(data.inviteToken, data.token);

  let href = firstPath(data.route, data.href, data.url, data.path);

  if (!href) {
    if (type === "workspace_message") {
      const conversationKind = String(data.conversationKind || data.chatType || "");
      const isGroup =
        conversationKind === "group" ||
        (!otherUserId && Boolean(workspaceId));
      href = isGroup
        ? WORKSPACE_GROUP_CHAT_PATH
        : otherUserId
          ? workspaceId
            ? `/messages/${otherUserId}?w=${encodeURIComponent(workspaceId)}`
            : `/messages/${otherUserId}`
          : "/messages";
    } else if (type === "workspace_invite") {
      href = inviteToken ? `/workspace/invite/${inviteToken}` : "/";
    } else if (type === "low_stock" || type === "new_product") {
      href = "/products";
    } else if (type === "new_sale") {
      href = "/sales";
    } else if (type === "new_user") {
      href = "/admin-dashboard";
    } else if (
      type === "task_assigned" ||
      type === "task_completed" ||
      type.includes("task") ||
      kind.includes("task") ||
      kind === "deadline"
    ) {
      href = taskId ? `/team/tasks?task=${encodeURIComponent(taskId)}` : "/team/tasks";
    } else if (type === "leave_request" || kind.includes("leave")) {
      href = leaveId ? `/hr/leave?leave=${encodeURIComponent(leaveId)}` : "/hr/leave";
    } else if (type === "approval_change_request" || kind.includes("approval")) {
      href = "/approvals";
    } else if (type === "schedule" || kind.includes("schedule") || kind.includes("automation")) {
      href = scheduleId
        ? `/calendar/schedules?schedule=${encodeURIComponent(scheduleId)}`
        : "/calendar/schedules";
    } else if (
      type === "reminder" ||
      type.includes("reminder") ||
      type.includes("calendar") ||
      kind.includes("calendar") ||
      kind === "meeting" ||
      kind === "event" ||
      title.includes("reminder")
    ) {
      if (taskId || kind === "deadline") {
        href = taskId ? `/team/tasks?task=${encodeURIComponent(taskId)}` : "/team/tasks";
      } else if (scheduleId) {
        href = `/calendar/schedules?schedule=${encodeURIComponent(scheduleId)}`;
      } else {
        href = eventId ? `/calendar/view?event=${encodeURIComponent(eventId)}` : "/calendar";
      }
    } else if (kind.includes("bill") || title.includes("bill")) {
      href = "/finance/bills";
    } else if (kind.includes("tax") || title.includes("tax")) {
      href = "/finance/taxes";
    } else if (kind.includes("payroll") || title.includes("payroll")) {
      href = "/finance/payroll";
    } else if (projectId || kind.includes("project")) {
      href = projectId ? `/projects/${encodeURIComponent(projectId)}` : "/projects";
    } else if (documentId || kind.includes("document")) {
      href = documentId ? `/documents/${encodeURIComponent(documentId)}` : "/documents";
    }
  }

  if (!href) return "";

  if (eventId) href = appendQuery(href, "event", eventId);
  if (taskId) href = appendQuery(href, "task", taskId);
  if (scheduleId) href = appendQuery(href, "schedule", scheduleId);
  if (leaveId) href = appendQuery(href, "leave", leaveId);

  return href;
}
