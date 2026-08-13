import {
  contributionLevelClass,
  formatProjectTimeframe,
  projectStatusClass,
  projectStatusLabel,
  taskStatusLabel,
  type ProjectAchievementItem,
  type ProjectContributionDay,
  type ProjectReminderItem,
  type ProjectsSummary,
} from "@/lib/projectWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Bell, Loader2, Trophy } from "lucide-react";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { projectApi } from "@/lib/api";

function buildContributionWeeks(days: ProjectContributionDay[]) {
  if (!days.length) return [] as ProjectContributionDay[][];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const first = new Date(`${days[0].date}T12:00:00`);
  const last = new Date(`${days[days.length - 1].date}T12:00:00`);

  // Pad to Sunday start so the grid aligns like GitHub.
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: ProjectContributionDay[][] = [];
  let week: ProjectContributionDay[] = [];

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    week.push(
      byDate.get(key) || {
        date: key,
        hours: 0,
        tasks: 0,
        count: 0,
        level: 0,
      },
    );
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks;
}

function ContributionGraph({
  days,
  emptyLabel,
}: {
  days: ProjectContributionDay[];
  emptyLabel: string;
}) {
  const weeks = useMemo(() => buildContributionWeeks(days), [days]);
  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, index) => {
      const mid = week[3] || week[0];
      if (!mid) return;
      const month = new Date(`${mid.date}T12:00:00`).getMonth();
      if (month !== lastMonth) {
        labels.push({
          index,
          label: new Date(`${mid.date}T12:00:00`).toLocaleDateString(undefined, { month: "short" }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const hasActivity = days.some((day) => day.level > 0);

  if (!weeks.length || !hasActivity) {
    return <p className="py-10 text-center text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="mb-1 flex gap-[3px] pl-7">
          {weeks.map((_, index) => {
            const label = monthLabels.find((row) => row.index === index);
            return (
              <div key={`m-${index}`} className="w-[11px] text-[9px] text-gray-400">
                {label?.label || ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-[2px] text-[9px] leading-none text-gray-400">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={`w-${weekIndex}`} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.hours}h logged, ${day.tasks} tasks done`}
                    className={cn("h-[11px] w-[11px] rounded-[2px]", contributionLevelClass(day.level))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-gray-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn("inline-block h-[11px] w-[11px] rounded-[2px]", contributionLevelClass(level))}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectsOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectsSummary | null>(null);
  const [graphProjectId, setGraphProjectId] = useState<string>("");

  const loadSummary = useCallback(async (projectId?: string) => {
    setLoading(true);
    try {
      const res = await projectApi.getSummary(projectId ? { projectId } : undefined);
      const data = (res.data as ProjectsSummary) || null;
      setSummary(data);
      const nextId = data?.contributionGraph?.projectId || data?.workQueue?.[0]?._id || "";
      setGraphProjectId((prev) => prev || nextId);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const onSelectGraphProject = (projectId: string) => {
    setGraphProjectId(projectId);
    void loadSummary(projectId);
  };

  const workQueue = summary?.workQueue || [];
  const contributionDays = summary?.contributionGraph?.days || [];
  const reminders = summary?.reminders || [];
  const achievements = summary?.achievements || [];
  const taskStatus = summary?.taskStatus || { todo: 0, in_progress: 0, done: 0 };
  const taskStatusTotal = taskStatus.todo + taskStatus.in_progress + taskStatus.done;
  const graphOptions = useMemo(() => {
    const fromApi = (summary?.projectOptions || []).map((row) => ({
      id: row._id,
      name: row.name,
    }));
    if (fromApi.length) return fromApi;
    return workQueue.map((row) => ({ id: row._id, name: row.name }));
  }, [summary, workQueue]);

  const selectedGraphProjectId = useMemo(() => {
    if (graphOptions.some((option) => option.id === graphProjectId)) {
      return graphProjectId;
    }
    return graphOptions[0]?.id || "";
  }, [graphOptions, graphProjectId]);

  if (loading && !summary) {
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
            <h2 className="text-lg font-semibold text-gray-900">{t("projectOverviewTitle")}</h2>
            <HelpTip text={t("helpProjectOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("projectOverviewSubtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link to="/projects/all">{t("projectViewAll")}</Link>
        </Button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("projectWorkQueueTitle")}</h3>
            <p className="text-xs text-gray-500">{t("projectWorkQueueSubtitle")}</p>
          </div>
        </div>
        {workQueue.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">{t("projectWorkQueueEmpty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workQueue.map((project) => (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 transition-colors hover:border-sky-300 hover:bg-sky-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{project.name}</p>
                    {project.clientName ? (
                      <p className="truncate text-xs text-gray-500">{project.clientName}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      projectStatusClass(project.status),
                    )}
                  >
                    {projectStatusLabel(project.status, t)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium text-gray-700">
                  {formatProjectTimeframe(project.startDate, project.targetEndDate)}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>
                    {t("projectOpenTasksCount").replace("{count}", String(project.openTasks))}
                  </span>
                  {project.leadName ? (
                    <span>{t("projectLeadLabel").replace("{name}", project.leadName)}</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("projectTaskStatusTitle")}</h3>
          <p className="text-xs text-gray-500">{t("projectTaskStatusSubtitle")}</p>
          <div className="mt-4 space-y-3">
            {(["todo", "in_progress", "done"] as const).map((status) => {
              const count = taskStatus[status] || 0;
              const pct = taskStatusTotal ? Math.round((count / taskStatusTotal) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-600">{taskStatusLabel(status, t)}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        status === "todo" && "bg-slate-400",
                        status === "in_progress" && "bg-sky-500",
                        status === "done" && "bg-emerald-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {taskStatusTotal === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("projectTaskStatusEmpty")}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t("projectRemindersTitle")}</h3>
          </div>
          <p className="text-xs text-gray-500">{t("projectRemindersSubtitle")}</p>
          {reminders.length === 0 ? (
            <p className="mt-6 py-4 text-center text-sm text-gray-500">{t("projectRemindersEmpty")}</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {reminders.map((item: ProjectReminderItem) => (
                <li key={item.id}>
                  <Link
                    to={item.projectId ? `/projects/${item.projectId}` : "/projects"}
                    className="block rounded-md border border-gray-100 px-3 py-2 hover:border-amber-200 hover:bg-amber-50/50"
                  >
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.type === "overdue_task"
                        ? t("projectReminderOverdueTask")
                        : item.type === "due_soon_task"
                          ? t("projectReminderDueSoonTask")
                          : t("projectReminderOverdueMilestone")}
                      {item.projectName ? ` · ${item.projectName}` : ""}
                      {item.dueDate ? ` · ${formatFinanceTableDate(item.dueDate)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t("projectAchievementsTitle")}</h3>
          </div>
          <p className="text-xs text-gray-500">{t("projectAchievementsSubtitle")}</p>
          {achievements.length === 0 ? (
            <p className="mt-6 py-4 text-center text-sm text-gray-500">{t("projectAchievementsEmpty")}</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {achievements.map((item: ProjectAchievementItem) => (
                <li
                  key={item.id}
                  className="rounded-md border border-emerald-100 bg-emerald-50/40 px-3 py-2"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {item.type === "tasks_completed_week"
                      ? t("projectAchievementTasksWeek").replace("{count}", String(item.count || 0))
                      : item.type === "milestones_completed_week"
                        ? t("projectAchievementMilestonesWeek").replace(
                            "{count}",
                            String(item.count || 0),
                          )
                        : item.type === "project_completed"
                          ? t("projectAchievementProjectDone").replace(
                              "{name}",
                              item.title || item.projectName || "",
                            )
                          : t("projectAchievementMilestoneDone")
                              .replace("{title}", item.title)
                              .replace("{project}", item.projectName || "")}
                  </p>
                  {item.completedAt ? (
                    <p className="text-xs text-gray-500">{formatFinanceTableDate(item.completedAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("projectContributionTitle")}</h3>
            <p className="text-xs text-gray-500">{t("projectContributionSubtitle")}</p>
          </div>
          {graphOptions.length > 0 ? (
            <Select value={selectedGraphProjectId} onValueChange={onSelectGraphProject}>
              <SelectTrigger className="w-[220px] shadow-none">
                <SelectValue placeholder={t("projectSelectProject")} />
              </SelectTrigger>
              <SelectContent>
                {graphOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <ContributionGraph
            days={contributionDays}
            emptyLabel={t("projectContributionEmpty")}
          />
        )}
      </section>
    </div>
  );
}
