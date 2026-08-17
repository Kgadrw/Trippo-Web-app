import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teamTaskApi, type TeamTaskRecord } from "@/lib/api";
import { formatMonthLabel, getMonthKey, teamPriorityBarClass, teamPriorityClass } from "@/lib/teamConstants";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpTip } from "@/components/ui/help-tip";
import { filterSelectClass } from "@/lib/fieldStyles";
import { cn } from "@/lib/utils";
import { websocketManager } from "@/lib/websocketManager";
import { matchesRealtimeRecord } from "@/lib/workspaceRealtime";
import { TEAM_TASK_EVENTS } from "@/lib/teamTaskRealtime";
import { UpcomingRemindersCard } from "@/components/reminders/UpcomingRemindersCard";
import type { UpcomingReminderItem } from "@/lib/workReminders";
import { assigneeKey, getAssigneeCardColor } from "@/components/team/TeamTaskBoard";
import { useTheme } from "@/hooks/useTheme";

const COLUMN_LIMIT = 12;
const RECENTLY_ADDED_MS = 7 * 24 * 60 * 60 * 1000;
/** Completed tasks stay in overview for one month, then drop off. */
const COMPLETED_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

function assigneeName(task: TeamTaskRecord, fallback: string) {
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return fallback;
}

function taskTime(
  task: TeamTaskRecord,
  field: "createdAt" | "completedAt" | "dueDate",
) {
  const value = task[field];
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}

function isRecentlyAdded(task: TeamTaskRecord) {
  const created = taskTime(task, "createdAt");
  if (!created) return false;
  return Date.now() - created <= RECENTLY_ADDED_MS;
}

function isCompletedWithinLastMonth(task: TeamTaskRecord) {
  const completed = taskTime(task, "completedAt") || taskTime(task, "createdAt");
  if (!completed) return false;
  return Date.now() - completed <= COMPLETED_VISIBLE_MS;
}

function formatShortDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type BoardColumn = {
  key: "todo" | "in_progress" | "done";
  title: string;
  empty: string;
  tasks: TeamTaskRecord[];
  accent: string;
  header: string;
  badge: string;
};

export function TeamOverviewTab() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [tasks, setTasks] = useState<TeamTaskRecord[]>([]);
  const [recentDoneTasks, setRecentDoneTasks] = useState<TeamTaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [monthRes, doneRes] = await Promise.all([
        teamTaskApi.getAll({ monthKey }),
        teamTaskApi.getAll({ status: "done" }),
      ]);
      setTasks(Array.isArray(monthRes.data) ? (monthRes.data as TeamTaskRecord[]) : []);
      setRecentDoneTasks(Array.isArray(doneRes.data) ? (doneRes.data as TeamTaskRecord[]) : []);
    } catch {
      setTasks([]);
      setRecentDoneTasks([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const refreshTasks = useCallback(async () => {
    try {
      const [monthRes, doneRes] = await Promise.all([
        teamTaskApi.getAll({ monthKey }),
        teamTaskApi.getAll({ status: "done" }),
      ]);
      setTasks(Array.isArray(monthRes.data) ? (monthRes.data as TeamTaskRecord[]) : []);
      setRecentDoneTasks(Array.isArray(doneRes.data) ? (doneRes.data as TeamTaskRecord[]) : []);
    } catch {
      // Keep existing tasks on background refresh failure
    }
  }, [monthKey]);

  useEffect(() => {
    const onTaskEvent = (data: { workspaceId?: string | null }) => {
      if (!matchesRealtimeRecord(data)) return;
      void refreshTasks();
    };

    const unsubCreated = websocketManager.subscribe(TEAM_TASK_EVENTS.created, onTaskEvent);
    const unsubUpdated = websocketManager.subscribe(TEAM_TASK_EVENTS.updated, onTaskEvent);
    const unsubDeleted = websocketManager.subscribe(TEAM_TASK_EVENTS.deleted, onTaskEvent);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [refreshTasks]);

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -2; i <= 4; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(getMonthKey(d));
    }
    return options;
  }, []);

  const upcomingReminders = useMemo<UpcomingReminderItem[]>(() => {
    const now = Date.now();
    const horizon = now + 7 * 24 * 60 * 60 * 1000;
    return tasks
      .filter((task) => task.status !== "done" && task.dueDate)
      .filter((task) => {
        const due = new Date(task.dueDate!).getTime();
        return Number.isFinite(due) && due >= now && due <= horizon;
      })
      .sort((a, b) => taskTime(a, "dueDate") - taskTime(b, "dueDate"))
      .slice(0, 6)
      .map((task) => ({
        id: `task-${task._id}`,
        kind: "deadline" as const,
        title: task.title,
        at: task.dueDate!,
        href: "/team/tasks",
        subtitle: assigneeName(task, t("teamUnknownMember")),
        reminderOffsets: (task.reminders || []).map((item) => item.offsetMinutes),
      }));
  }, [t, tasks]);

  const columns = useMemo<BoardColumn[]>(() => {
    const todo = tasks
      .filter((task) => (task.status || "todo") === "todo")
      .sort((a, b) => taskTime(b, "createdAt") - taskTime(a, "createdAt"))
      .slice(0, COLUMN_LIMIT);

    const inProgress = tasks
      .filter((task) => task.status === "in_progress")
      .sort((a, b) => {
        const aDue = taskTime(a, "dueDate") || Number.MAX_SAFE_INTEGER;
        const bDue = taskTime(b, "dueDate") || Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      })
      .slice(0, COLUMN_LIMIT);

    const recentCompleted = recentDoneTasks
      .filter((task) => task.status === "done" && isCompletedWithinLastMonth(task))
      .sort((a, b) => taskTime(b, "completedAt") - taskTime(a, "completedAt"))
      .slice(0, COLUMN_LIMIT);

    return [
      {
        key: "todo",
        title: t("teamStatusTodo"),
        empty: t("teamNoTasks"),
        tasks: todo,
        accent: "border-slate-200 bg-slate-50/80",
        header: "text-slate-700",
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
      },
      {
        key: "in_progress",
        title: t("teamStatusInProgress"),
        empty: t("teamNoOngoingTasks"),
        tasks: inProgress,
        accent: "border-sky-200 bg-sky-50/80",
        header: "text-sky-700",
        badge: "bg-sky-100 text-sky-700 ring-sky-200",
      },
      {
        key: "done",
        title: t("teamRecentCompletions"),
        empty: t("teamNoRecentCompletions"),
        tasks: recentCompleted,
        accent: "border-emerald-200 bg-emerald-50/80",
        header: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      },
    ];
  }, [recentDoneTasks, t, tasks]);

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
            <h2 className="text-lg font-semibold text-gray-900">{t("teamOverviewTitle")}</h2>
            <HelpTip text={t("helpTeamOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("teamOverviewSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={monthKey} onValueChange={setMonthKey}>
            <SelectTrigger className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {formatMonthLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link to="/team/tasks" className="gap-1.5">
              {t("teamManageTasks")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/hr/people">{t("teamManageMembers")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/team/tasks">{t("teamAssignTask")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.key}
            className={cn("flex min-h-[320px] flex-col rounded-lg border", column.accent)}
          >
            <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-3">
              <h3 className={cn("text-sm font-semibold", column.header)}>{column.title}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                  column.badge,
                )}
              >
                {column.tasks.length}
              </span>
            </div>

            <ul className="flex-1 space-y-2 p-3">
              {column.tasks.length === 0 ? (
                <li className="rounded-md border border-dashed border-gray-200 bg-white/70 px-3 py-8 text-center text-sm text-gray-500">
                  {column.empty}
                </li>
              ) : (
                column.tasks.map((task) => {
                  const due = formatShortDate(task.dueDate);
                  const completed = formatShortDate(task.completedAt);
                  const showRecentBadge = column.key === "todo" && isRecentlyAdded(task);
                  const cardColor = getAssigneeCardColor(assigneeKey(task), resolvedTheme);
                  const isDone = column.key === "done";

                  return (
                    <li
                      key={task._id}
                      className="task-assignee-card flex overflow-hidden rounded border shadow-none"
                      style={{ borderColor: cardColor, backgroundColor: cardColor }}
                    >
                      <span
                        aria-hidden
                        className={cn("w-1 shrink-0 self-stretch", teamPriorityBarClass(task.priority))}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "min-w-0 flex-1 break-words text-sm font-medium leading-snug text-gray-900",
                              isDone && "line-through text-gray-500",
                            )}
                          >
                            {task.title}
                          </p>
                          {showRecentBadge ? (
                            <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
                              {t("teamRecentlyAdded")}
                            </span>
                          ) : null}
                        </div>
                        <p className={cn("truncate text-xs text-gray-500", isDone && "line-through")}>
                          {assigneeName(task, t("teamUnknownMember"))}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          {isDone && completed ? (
                            <span>{completed}</span>
                          ) : due ? (
                            <span>
                              {t("teamDueDate")}: {due}
                            </span>
                          ) : null}
                          {task.priority ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide capitalize",
                                teamPriorityClass(task.priority),
                              )}
                            >
                              {task.priority}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        ))}
      </div>

      <UpcomingRemindersCard
        items={upcomingReminders}
        title="Team deadlines & reminders"
        className="rounded-none border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );
}
