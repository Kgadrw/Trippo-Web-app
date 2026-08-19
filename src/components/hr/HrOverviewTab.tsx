import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  leaveRequestApi,
  teamTaskApi,
  type TeamMemberRecord,
  type TeamTaskRecord,
} from "@/lib/api";
import { formatMonthLabel, getMonthKey } from "@/lib/teamConstants";
import {
  formatLeaveRange,
  leaveStatusLabel,
  leaveTypeLabel,
  type LeaveRequestRecord,
} from "@/lib/leaveWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { websocketManager } from "@/lib/websocketManager";
import { matchesRealtimeRecord } from "@/lib/workspaceRealtime";
import { TEAM_TASK_EVENTS } from "@/lib/teamTaskRealtime";

type ActivityItem = {
  id: string;
  kind: "task_completed" | "task_created" | "leave";
  title: string;
  subtitle: string;
  at: number;
  href?: string;
};

function memberId(value: TeamMemberRecord | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

function assigneeId(task: TeamTaskRecord) {
  return memberId(task.assigneeId as TeamMemberRecord | string);
}

function assigneeName(task: TeamTaskRecord, fallback: string) {
  if (task.assignees?.length) {
    const names = task.assignees
      .map((a) => (typeof a === "object" && a?.name ? a.name : ""))
      .filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return fallback;
}

function timeValue(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOnLeaveNow(leave: LeaveRequestRecord, now = new Date()) {
  if (leave.status !== "approved") return false;
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

export function HrOverviewTab() {
  const { t } = useTranslation();
  const monthKey = getMonthKey();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TeamTaskRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, leaveRes] = await Promise.all([
        teamTaskApi.getAll({ monthKey }),
        leaveRequestApi.getAll(),
      ]);

      setTasks(Array.isArray(tasksRes.data) ? (tasksRes.data as TeamTaskRecord[]) : []);
      setLeaveRequests(Array.isArray(leaveRes.data) ? (leaveRes.data as LeaveRequestRecord[]) : []);
    } catch {
      setTasks([]);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refreshQuietly = useCallback(async () => {
    try {
      const [tasksRes, leaveRes] = await Promise.all([
        teamTaskApi.getAll({ monthKey }),
        leaveRequestApi.getAll(),
      ]);
      setTasks(Array.isArray(tasksRes.data) ? (tasksRes.data as TeamTaskRecord[]) : []);
      setLeaveRequests(Array.isArray(leaveRes.data) ? (leaveRes.data as LeaveRequestRecord[]) : []);
    } catch {
      // Keep current dashboard on background refresh failure
    }
  }, [monthKey]);

  useEffect(() => {
    const onTaskEvent = (data: { workspaceId?: string | null }) => {
      if (!matchesRealtimeRecord(data)) return;
      void refreshQuietly();
    };
    const onLeaveRefresh = () => {
      void refreshQuietly();
    };
    const unsubCreated = websocketManager.subscribe(TEAM_TASK_EVENTS.created, onTaskEvent);
    const unsubUpdated = websocketManager.subscribe(TEAM_TASK_EVENTS.updated, onTaskEvent);
    const unsubDeleted = websocketManager.subscribe(TEAM_TASK_EVENTS.deleted, onTaskEvent);
    window.addEventListener("leave-requests-should-refresh", onLeaveRefresh);
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      window.removeEventListener("leave-requests-should-refresh", onLeaveRefresh);
    };
  }, [refreshQuietly]);

  const ongoingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "in_progress")
        .sort((a, b) => {
          const aDue = timeValue(a.dueDate) || Number.MAX_SAFE_INTEGER;
          const bDue = timeValue(b.dueDate) || Number.MAX_SAFE_INTEGER;
          return aDue - bDue;
        }),
    [tasks],
  );

  const onLeaveNow = useMemo(
    () => leaveRequests.filter((leave) => isOnLeaveNow(leave)),
    [leaveRequests],
  );

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const task of tasks) {
      if (task.status === "done" && task.completedAt) {
        items.push({
          id: `done-${task._id}`,
          kind: "task_completed",
          title: task.title,
          subtitle: `${assigneeName(task, t("teamUnknownMember"))} · ${t("teamStatusDone")}`,
          at: timeValue(task.completedAt),
          href: `/hr/people/${assigneeId(task)}`,
        });
      } else if (task.createdAt && (task.status === "todo" || task.status === "in_progress")) {
        items.push({
          id: `created-${task._id}`,
          kind: "task_created",
          title: task.title,
          subtitle: `${assigneeName(task, t("teamUnknownMember"))} · ${
            task.status === "in_progress" ? t("teamStatusInProgress") : t("teamStatusTodo")
          }`,
          at: timeValue(task.createdAt),
          href: `/hr/people/${assigneeId(task)}`,
        });
      }
    }

    for (const leave of leaveRequests) {
      items.push({
        id: `leave-${leave._id || leave.id}`,
        kind: "leave",
        title: `${leave.requesterName} — ${leaveTypeLabel(leave.leaveType)}`,
        subtitle: `${leaveStatusLabel(leave.status)} · ${formatLeaveRange(
          leave.startDate,
          leave.endDate,
          leave.dayCount,
        )}`,
        at: timeValue(leave.createdAt) || timeValue(leave.startDate),
        href: "/hr/leave",
      });
    }

    return items
      .filter((item) => item.at > 0)
      .sort((a, b) => b.at - a.at)
      .slice(0, 12);
  }, [leaveRequests, t, tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("hrOverviewTitle")}</h2>
            <HelpTip text={t("helpHrOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("hrOverviewSubtitle")}</p>
          <p className="mt-1 text-xs text-gray-400">{formatMonthLabel(monthKey)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/hr/people">{t("hrViewPeople")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/team/tasks">{t("teamManageTasks")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/hr/leave">{t("hrOpenLeave")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{t("hrCurrentTasksTitle")}</h3>
            <p className="text-xs text-gray-500">{t("hrCurrentTasksHint")}</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {ongoingTasks.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">{t("teamNoOngoingTasks")}</li>
            ) : (
              ongoingTasks.slice(0, 10).map((task) => (
                <li key={task._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {assigneeName(task, t("teamUnknownMember"))}
                        {task.priority ? ` · ${task.priority}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {task.dueDate ? formatShortDate(task.dueDate) : "—"}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{t("hrRecentActivityTitle")}</h3>
            <p className="text-xs text-gray-500">{t("hrRecentActivityHint")}</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {recentActivities.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">{t("hrNoRecentActivity")}</li>
            ) : (
              recentActivities.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.href ? (
                        <Link to={item.href} className="truncate text-sm font-medium text-sky-700 hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500">{item.subtitle}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        item.kind === "task_completed" && "bg-emerald-50 text-emerald-700",
                        item.kind === "task_created" && "bg-sky-50 text-sky-700",
                        item.kind === "leave" && "bg-amber-50 text-amber-700",
                      )}
                    >
                      {item.kind === "leave"
                        ? t("hrLeave")
                        : item.kind === "task_completed"
                          ? t("teamStatusDone")
                          : t("teamStatusTodo")}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {onLeaveNow.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-900">{t("hrOnLeaveNow")}</h3>
          <ul className="mt-3 space-y-2">
            {onLeaveNow.map((leave) => (
              <li key={leave._id || leave.id} className="text-sm text-amber-900">
                <span className="font-medium">{leave.requesterName}</span>
                {" — "}
                {leaveTypeLabel(leave.leaveType)}
                {" · "}
                {formatLeaveRange(leave.startDate, leave.endDate, leave.dayCount)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
