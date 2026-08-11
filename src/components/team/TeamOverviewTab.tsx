import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teamTaskApi, type TeamTaskRecord } from "@/lib/api";
import { formatMonthLabel, getMonthKey } from "@/lib/teamConstants";
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

const COLUMN_LIMIT = 12;
const RECENTLY_ADDED_MS = 7 * 24 * 60 * 60 * 1000;

function assigneeName(task: TeamTaskRecord, fallback: string) {
  if (typeof task.assigneeId === "object" && task.assigneeId?.name) {
    return task.assigneeId.name;
  }
  return fallback;
}

function taskTime(task: TeamTaskRecord, field: "createdAt" | "completedAt" | "dueDate") {
  const value = task[field];
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}

function isRecentlyAdded(task: TeamTaskRecord) {
  const created = taskTime(task, "createdAt");
  if (!created) return false;
  return Date.now() - created <= RECENTLY_ADDED_MS;
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
};

export function TeamOverviewTab() {
  const { t } = useTranslation();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [tasks, setTasks] = useState<TeamTaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamTaskApi.getAll({ monthKey });
      setTasks(Array.isArray(res.data) ? (res.data as TeamTaskRecord[]) : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await teamTaskApi.getAll({ monthKey });
      setTasks(Array.isArray(res.data) ? (res.data as TeamTaskRecord[]) : []);
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

    const recentCompleted = tasks
      .filter((task) => task.status === "done")
      .sort((a, b) => taskTime(b, "completedAt") - taskTime(a, "completedAt"))
      .slice(0, COLUMN_LIMIT);

    return [
      {
        key: "todo",
        title: t("teamStatusTodo"),
        empty: t("teamNoTasks"),
        tasks: todo,
        accent: "border-slate-200",
        header: "text-slate-700",
      },
      {
        key: "in_progress",
        title: t("teamStatusInProgress"),
        empty: t("teamNoOngoingTasks"),
        tasks: inProgress,
        accent: "border-sky-200",
        header: "text-sky-700",
      },
      {
        key: "done",
        title: t("teamRecentCompletions"),
        empty: t("teamNoRecentCompletions"),
        tasks: recentCompleted,
        accent: "border-emerald-200",
        header: "text-emerald-700",
      },
    ];
  }, [t, tasks]);

  const counts = useMemo(
    () => ({
      todo: tasks.filter((task) => (task.status || "todo") === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

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
        <div className="flex flex-wrap items-center gap-2">
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
          <Button asChild size="sm">
            <Link to="/team/tasks">{t("teamAssignTask")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("teamStatusTodo")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{counts.todo}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">{t("teamStatusInProgress")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{counts.inProgress}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">{t("teamRecentCompletions")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{counts.done}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.key}
            className={cn("flex min-h-[320px] flex-col rounded-lg border bg-gray-50/70", column.accent)}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-4 py-3">
              <h3 className={cn("text-sm font-semibold", column.header)}>{column.title}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
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

                  return (
                    <li
                      key={task._id}
                      className="rounded-md border border-gray-200 bg-white p-3 shadow-none"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        {showRecentBadge ? (
                          <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
                            {t("teamRecentlyAdded")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {assigneeName(task, t("teamUnknownMember"))}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        {column.key === "done" && completed ? (
                          <span>{completed}</span>
                        ) : due ? (
                          <span>
                            {t("teamDueDate")}: {due}
                          </span>
                        ) : null}
                        {task.priority ? (
                          <span className="capitalize">{task.priority}</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/team/tasks" className="gap-1.5">
            {t("teamManageTasks")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/hr/people">{t("teamManageMembers")}</Link>
        </Button>
      </div>
    </div>
  );
}
