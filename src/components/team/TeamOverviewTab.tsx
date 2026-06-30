import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teamTaskApi, type TeamMemberRecord, type TeamTaskRecord } from "@/lib/api";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SummaryData {
  total: number;
  byStatus: { todo: number; in_progress: number; done: number };
  completionRate: number;
  activeMembers: number;
  byMember: Array<{
    assigneeId: string;
    member: TeamMemberRecord | null;
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    progress: number;
  }>;
  recentDone: TeamTaskRecord[];
}

const STATUS_CHART_COLORS = {
  todo: "#94a3b8",
  in_progress: "#0ea5e9",
  done: "#10b981",
} as const;

const STATUS_STYLES = {
  todo: { bar: "bg-slate-300", text: "text-slate-600" },
  in_progress: { bar: "bg-sky-500", text: "text-sky-700" },
  done: { bar: "bg-emerald-500", text: "text-emerald-700" },
} as const;

function statusLabel(status: string, t: (key: string) => string) {
  return t(
    `teamStatus${status === "in_progress" ? "InProgress" : status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
}

export function TeamOverviewTab() {
  const { t } = useTranslation();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const taskRes = await teamTaskApi.getSummary({ monthKey });
      setSummary((taskRes.data as SummaryData) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await teamTaskApi.getSummary({ monthKey });
      setSummary((res.data as SummaryData) || null);
    } catch {
      // Keep existing summary on background refresh failure
    }
  }, [monthKey]);

  useEffect(() => {
    const onTaskEvent = (data: { workspaceId?: string | null }) => {
      if (!matchesRealtimeRecord(data)) return;
      void refreshSummary();
    };

    const unsubCreated = websocketManager.subscribe(TEAM_TASK_EVENTS.created, onTaskEvent);
    const unsubUpdated = websocketManager.subscribe(TEAM_TASK_EVENTS.updated, onTaskEvent);
    const unsubDeleted = websocketManager.subscribe(TEAM_TASK_EVENTS.deleted, onTaskEvent);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [refreshSummary]);

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -2; i <= 4; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(getMonthKey(d));
    }
    return options;
  }, []);

  const stats = summary || {
    total: 0,
    byStatus: { todo: 0, in_progress: 0, done: 0 },
    completionRate: 0,
    activeMembers: 0,
    byMember: [],
    recentDone: [],
  };

  const recentDone = stats.recentDone.slice(0, 3);
  const hasTasks = stats.total > 0;

  const statusSegments = useMemo(() => {
    if (!hasTasks) return [];
    const { total } = stats;
    return (["done", "in_progress", "todo"] as const).map((key) => ({
      key,
      count: stats.byStatus[key],
      width: (stats.byStatus[key] / total) * 100,
    }));
  }, [hasTasks, stats]);

  const memberChartData = useMemo(
    () =>
      stats.byMember.map((row) => ({
        name: row.member?.name || t("teamUnknownMember"),
        total: row.total,
        todo: row.todo,
        inProgress: row.inProgress,
        done: row.done,
      })),
    [stats.byMember, t],
  );

  const memberChartHeight = Math.max(280, memberChartData.length * 56 + 80);

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
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        {!hasTasks ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-600">{t("teamNoTasks")}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/team/tasks">{t("teamAssignTask")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tabular-nums text-gray-900">{stats.completionRate}%</p>
                <p className="mt-1 text-sm text-gray-600">
                  {stats.byStatus.done} / {stats.total} {t("teamOverviewTasksDone")}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {stats.activeMembers} {t("teamOverviewMembersActive")}
              </p>
            </div>

            <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
              {statusSegments.map(
                (segment) =>
                  segment.width > 0 && (
                    <div
                      key={segment.key}
                      className={cn(STATUS_STYLES[segment.key].bar, "h-full")}
                      style={{ width: `${segment.width}%` }}
                      title={`${statusLabel(segment.key, t)}: ${segment.count}`}
                    />
                  ),
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
              {(["todo", "in_progress", "done"] as const).map((statusKey) => (
                <div key={statusKey} className="text-center sm:text-left">
                  <p className={cn("text-xs font-medium", STATUS_STYLES[statusKey].text)}>
                    {statusLabel(statusKey, t)}
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">
                    {stats.byStatus[statusKey]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {memberChartData.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("teamProgressByMember")}</h3>
          <p className="mt-1 text-xs text-gray-500">{t("teamOverviewMemberChartHint")}</p>

          <div className="mt-4" style={{ height: memberChartHeight }}>
            <ResponsiveContainer width="100%" height={memberChartHeight}>
              <BarChart
                data={memberChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: memberChartData.length > 4 ? 48 : 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={memberChartData.length > 3 ? -18 : 0}
                  textAnchor={memberChartData.length > 3 ? "end" : "middle"}
                  height={memberChartData.length > 3 ? 56 : 32}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as (typeof memberChartData)[number];
                    return (
                      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <p className="mb-2 font-medium text-gray-900">{label}</p>
                        <p className="text-gray-600">
                          {t("teamTotalTasks")}: <span className="font-semibold text-gray-900">{row.total}</span>
                        </p>
                        <p className="text-slate-600">
                          {statusLabel("todo", t)}: <span className="font-semibold">{row.todo}</span>
                        </p>
                        <p className="text-sky-700">
                          {statusLabel("in_progress", t)}:{" "}
                          <span className="font-semibold">{row.inProgress}</span>
                        </p>
                        <p className="text-emerald-700">
                          {statusLabel("done", t)}: <span className="font-semibold">{row.done}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => {
                    if (value === "todo") return statusLabel("todo", t);
                    if (value === "inProgress") return statusLabel("in_progress", t);
                    if (value === "done") return statusLabel("done", t);
                    return value;
                  }}
                />
                <Bar
                  dataKey="todo"
                  name="todo"
                  fill={STATUS_CHART_COLORS.todo}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="inProgress"
                  name="inProgress"
                  fill={STATUS_CHART_COLORS.in_progress}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="done"
                  name="done"
                  fill={STATUS_CHART_COLORS.done}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 pt-2">
            <li className="hidden grid-cols-5 gap-2 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid">
              <span>{t("teamMembers")}</span>
              <span className="text-center">{t("teamTotalTasks")}</span>
              <span className="text-center">{statusLabel("todo", t)}</span>
              <span className="text-center">{statusLabel("in_progress", t)}</span>
              <span className="text-center">{statusLabel("done", t)}</span>
            </li>
            {stats.byMember.map((row) => {
              const name = row.member?.name || t("teamUnknownMember");
              return (
                <li
                  key={row.assigneeId}
                  className="grid grid-cols-2 gap-2 py-2.5 text-sm sm:grid-cols-5 sm:items-center"
                >
                  <span className="truncate font-medium text-gray-900 sm:col-span-1">{name}</span>
                  <span className="text-gray-600 sm:text-center">
                    <span className="sm:hidden">{t("teamTotalTasks")}: </span>
                    {row.total}
                  </span>
                  <span className={cn("sm:text-center", STATUS_STYLES.todo.text)}>
                    <span className="sm:hidden">{statusLabel("todo", t)}: </span>
                    {row.todo}
                  </span>
                  <span className={cn("sm:text-center", STATUS_STYLES.in_progress.text)}>
                    <span className="sm:hidden">{statusLabel("in_progress", t)}: </span>
                    {row.inProgress}
                  </span>
                  <span className={cn("sm:text-center", STATUS_STYLES.done.text)}>
                    <span className="sm:hidden">{statusLabel("done", t)}: </span>
                    {row.done}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recentDone.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("teamRecentCompletions")}</h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {recentDone.map((task) => {
              const assignee =
                typeof task.assigneeId === "object" ? task.assigneeId?.name : undefined;
              return (
                <li key={task._id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{assignee || t("teamUnknownMember")}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
